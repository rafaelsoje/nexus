import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, PaymentStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);
      return this.prisma.contract.findMany({
        where: { companyId: company.id },
        orderBy: { startsAt: "desc" },
        include: { event: true, freelancer: true, payment: true },
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.contract.findMany({
      where: { freelancerId: freelancer.id },
      orderBy: { startsAt: "desc" },
      include: {
        event: true,
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            city: true,
            state: true,
          },
        },
        payment: true,
      },
    });
  }

  async confirmByCompany(userId: string, contractId: string) {
    const company = await this.findCompanyByUserId(userId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, companyId: company.id },
      include: { payment: true },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (contract.payment?.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Payment must be paid before confirmation");
    }

    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: ContractStatus.CONFIRMED },
    });
  }

  async updateStatus(
    userId: string,
    role: UserRole,
    contractId: string,
    status: ContractStatus,
  ) {
    const contract = await this.findParticipantContract(
      userId,
      role,
      contractId,
    );
    this.assertAllowedStatusTransition(
      role,
      contract.status,
      status,
      contract.endsAt,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: { status },
        include: { event: true, company: true, freelancer: true },
      });

      const recipientUserId =
        role === UserRole.COMPANY
          ? contract.freelancer.userId
          : contract.company.userId;

      await tx.notification.create({
        data: {
          userId: recipientUserId,
          type: "CONTRACT_STATUS_UPDATED",
          title: "Contrato atualizado",
          body: `${contract.event.name}: status alterado para ${status}.`,
        },
      });

      return updatedContract;
    });
  }

  async hasScheduleConflict(
    freelancerId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const count = await this.prisma.contract.count({
      where: {
        freelancerId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        status: {
          in: [ContractStatus.PENDING_PAYMENT, ContractStatus.CONFIRMED],
        },
      },
    });

    return count > 0;
  }

  private async findCompanyByUserId(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!company) {
      throw new ForbiddenException("Company profile is required");
    }

    return company;
  }

  private async findParticipantContract(
    userId: string,
    role: UserRole,
    contractId: string,
  ) {
    const participantWhere =
      role === UserRole.COMPANY
        ? { company: { userId } }
        : { freelancer: { userId } };
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, ...participantWhere },
      include: { event: true, company: true, freelancer: true },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return contract;
  }

  private assertAllowedStatusTransition(
    role: UserRole,
    currentStatus: ContractStatus,
    nextStatus: ContractStatus,
    endsAt: Date,
  ) {
    const allowedByRole: Record<
      Extract<UserRole, "COMPANY" | "FREELANCER">,
      Set<ContractStatus>
    > = {
      [UserRole.COMPANY]: new Set([
        ContractStatus.COMPLETED,
        ContractStatus.NO_SHOW,
        ContractStatus.CANCELLED,
      ]),
      [UserRole.FREELANCER]: new Set([
        ContractStatus.COMPLETED,
        ContractStatus.CANCELLED,
      ]),
    };

    if (role === UserRole.ADMIN || !allowedByRole[role].has(nextStatus)) {
      throw new ForbiddenException("Contract status update is not allowed");
    }

    const canComplete =
      nextStatus === ContractStatus.COMPLETED &&
      currentStatus === ContractStatus.CONFIRMED;
    const canNoShow =
      nextStatus === ContractStatus.NO_SHOW &&
      currentStatus === ContractStatus.CONFIRMED;
    const canCancel =
      nextStatus === ContractStatus.CANCELLED &&
      new Set<ContractStatus>([
        ContractStatus.PENDING_PAYMENT,
        ContractStatus.CONFIRMED,
      ]).has(currentStatus);

    if (!canComplete && !canNoShow && !canCancel) {
      throw new BadRequestException("Contract status transition is invalid");
    }

    if (
      (nextStatus === ContractStatus.COMPLETED ||
        nextStatus === ContractStatus.NO_SHOW) &&
      new Date() < endsAt
    ) {
      throw new BadRequestException("Contract cannot be closed before event ends");
    }

    if (
      nextStatus === ContractStatus.NO_SHOW &&
      new Date() > this.addBusinessDays(endsAt, 1)
    ) {
      throw new BadRequestException("No-show deadline has expired");
    }
  }

  private addBusinessDays(date: Date, days: number) {
    const result = new Date(date);
    let remainingDays = days;

    while (remainingDays > 0) {
      result.setDate(result.getDate() + 1);

      if (result.getDay() !== 0 && result.getDay() !== 6) {
        remainingDays -= 1;
      }
    }

    return result;
  }

  private async findFreelancerByUserId(userId: string) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return freelancer;
  }
}
