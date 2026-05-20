import { Injectable } from "@nestjs/common";
import {
  ContractStatus,
  DisputeStatus,
  PaymentStatus,
  VerificationStatus,
} from "@prisma/client";
import { CompanyAccessService } from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  updateUserStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        refreshTokenHash: isActive ? undefined : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  listCompanies() {
    return this.prisma.companyProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        wallet: true,
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  listFreelancers() {
    return this.prisma.freelancerProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        wallet: true,
        skills: { include: { skill: true } },
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  listEvents() {
    return this.prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        company: true,
        requirements: { include: { skill: true } },
        invitations: true,
        contracts: true,
      },
    });
  }

  listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        splits: true,
        contract: { include: { event: true, company: true, freelancer: true } },
      },
    });
  }

  listDisputes() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contract: { include: { event: true, company: true, freelancer: true } },
      },
    });
  }

  updateCompanyVerification(id: string, status: VerificationStatus) {
    return this.prisma.companyProfile.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  updateFreelancerVerification(id: string, status: VerificationStatus) {
    return this.prisma.freelancerProfile.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  updateDisputeStatus(id: string, status: DisputeStatus) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id },
        data: { status },
        include: {
          contract: {
            include: {
              event: true,
              company: true,
              freelancer: true,
              payment: true,
            },
          },
        },
      });

      if (
        dispute.contract.status === ContractStatus.DISPUTED &&
        (status === DisputeStatus.RESOLVED || status === DisputeStatus.REJECTED)
      ) {
        await tx.contract.update({
          where: { id: dispute.contractId },
          data: {
            status:
              dispute.contract.payment?.status === PaymentStatus.PAID
                ? ContractStatus.CONFIRMED
                : ContractStatus.PENDING_PAYMENT,
          },
        });
      }

      const notification = {
        type: "DISPUTE_STATUS_UPDATED",
        title: "Disputa atualizada",
        body: `${dispute.contract.event.name}: status alterado para ${status}.`,
      };

      await this.companyAccess.notifyCompanyMembers(
        tx,
        dispute.contract.companyId,
        notification,
      );
      await tx.notification.createMany({
        data: [
          {
            userId: dispute.contract.freelancer.userId,
            ...notification,
          },
        ],
      });

      return dispute;
    });
  }
}
