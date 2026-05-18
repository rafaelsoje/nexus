import { Injectable } from "@nestjs/common";
import { VerificationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  listCompanies() {
    return this.prisma.companyProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        wallet: true,
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
}
