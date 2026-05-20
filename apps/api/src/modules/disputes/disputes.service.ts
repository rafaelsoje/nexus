import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, UserRole } from "@prisma/client";
import {
  publicCompanySelect,
  publicFreelancerSelect,
} from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyOperateRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDisputeDto } from "./dto/create-dispute.dto";

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async listMine(userId: string, role: UserRole) {
    const participantWhere = await this.contractParticipantWhere(userId, role);
    return this.prisma.dispute.findMany({
      where: { contract: participantWhere },
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          include: {
            event: true,
            company: { select: publicCompanySelect },
            freelancer: { select: publicFreelancerSelect },
          },
        },
      },
    });
  }

  async create(userId: string, role: UserRole, dto: CreateDisputeDto) {
    const participantWhere = await this.contractParticipantWhere(userId, role);
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, ...participantWhere },
      include: { company: true, event: true, freelancer: true },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (contract.status === ContractStatus.DISPUTED) {
      throw new BadRequestException("Contract already has an open dispute");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.DISPUTED },
      });

      const dispute = await tx.dispute.create({
        data: {
          contractId: contract.id,
          reason: dto.reason,
          details: dto.details,
        },
      });

      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true },
        select: { id: true },
      });

      const disputeNotification = {
        type: "DISPUTE_OPENED",
        title: "Disputa aberta",
        body: `Uma disputa foi aberta no contrato de ${contract.event.name}.`,
      };

      if (role === UserRole.COMPANY) {
        await tx.notification.create({
          data: {
            userId: contract.freelancer.userId,
            ...disputeNotification,
          },
        });
      } else {
        await this.companyAccess.notifyCompanyMembers(
          tx,
          contract.companyId,
          disputeNotification,
        );
      }

      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "DISPUTE_OPENED",
          title: "Nova disputa para análise",
          body: `${contract.event.name}: ${dto.reason}.`,
        })),
      });

      return dispute;
    });
  }

  private async contractParticipantWhere(userId: string, role: UserRole) {
    if (role === UserRole.COMPANY) {
      const company = await this.companyAccess.findCompanyForUser(
        userId,
        companyReadRoles,
      );

      return { companyId: company.id };
    }

    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return { freelancerId: freelancer.id };
  }
}
