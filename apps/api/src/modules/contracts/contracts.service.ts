import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, UserRole } from "@prisma/client";
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
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: ContractStatus.CONFIRMED },
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
