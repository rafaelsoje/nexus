import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, InvitationStatus } from "@prisma/client";
import { ContractsService } from "../contracts/contracts.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBulkInvitationDto } from "./dto/create-bulk-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
  ) {}

  async create(userId: string, dto: CreateInvitationDto) {
    const company = await this.findCompanyByUserId(userId);
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, companyId: company.id },
      include: { requirements: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { id: dto.freelancerId },
    });

    if (!freelancer) {
      throw new NotFoundException("Freelancer not found");
    }

    if (new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException(
        "Invitation expiration must be in the future",
      );
    }

    const conflict = await this.contractsService.hasScheduleConflict(
      freelancer.id,
      event.startsAt,
      event.endsAt,
    );

    if (conflict) {
      throw new BadRequestException(
        "Freelancer already has a contract in this time range",
      );
    }

    if (
      await this.hasBlockedAvailability(
        freelancer.id,
        event.startsAt,
        event.endsAt,
      )
    ) {
      throw new BadRequestException(
        "Freelancer is unavailable in this time range",
      );
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        eventId: event.id,
        freelancerId: freelancer.id,
        status: {
          in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED],
        },
      },
    });

    if (existingInvitation) {
      throw new BadRequestException(
        "Freelancer already has an active invitation for this event",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.create({
        data: {
          eventId: event.id,
          companyId: company.id,
          freelancerId: freelancer.id,
          expiresAt: new Date(dto.expiresAt),
          message: dto.message,
        },
        include: {
          event: true,
          freelancer: {
            select: { id: true, displayName: true, city: true, state: true },
          },
        },
      });

      await tx.chatThread.create({
        data: {
          eventId: event.id,
          companyId: company.id,
          freelancerId: freelancer.id,
          invitationId: invitation.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: freelancer.userId,
          type: "INVITATION_RECEIVED",
          title: "Novo convite recebido",
          body: `${company.companyName} convidou você para ${event.name}.`,
        },
      });

      return invitation;
    });
  }

  async createBulk(userId: string, dto: CreateBulkInvitationDto) {
    const uniqueFreelancerIds = [...new Set(dto.freelancerIds)];
    const invited = [];
    const skipped = [];

    for (const freelancerId of uniqueFreelancerIds) {
      try {
        const invitation = await this.create(userId, {
          eventId: dto.eventId,
          freelancerId,
          expiresAt: dto.expiresAt,
          message: dto.message,
        });
        invited.push(invitation);
      } catch (caught) {
        skipped.push({
          freelancerId,
          reason:
            caught instanceof Error
              ? caught.message
              : "Invitation could not be created",
        });
      }
    }

    return {
      invited,
      skipped,
      totals: {
        requested: uniqueFreelancerIds.length,
        invited: invited.length,
        skipped: skipped.length,
      },
    };
  }

  async listSent(userId: string) {
    const company = await this.findCompanyByUserId(userId);
    return this.prisma.invitation.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: true,
        freelancer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async listReceived(userId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.invitation.findMany({
      where: { freelancerId: freelancer.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            city: true,
            state: true,
          },
        },
      },
    });
  }

  async accept(userId: string, invitationId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const invitation = await this.findInvitationForFreelancer(
      invitationId,
      freelancer.id,
    );

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    if (invitation.expiresAt <= new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException("Invitation expired");
    }

    const conflict = await this.contractsService.hasScheduleConflict(
      freelancer.id,
      invitation.event.startsAt,
      invitation.event.endsAt,
    );

    if (conflict) {
      throw new BadRequestException(
        "Freelancer already has a contract in this time range",
      );
    }

    if (
      await this.hasBlockedAvailability(
        freelancer.id,
        invitation.event.startsAt,
        invitation.event.endsAt,
      )
    ) {
      throw new BadRequestException(
        "Freelancer is unavailable in this time range",
      );
    }

    const amountCents =
      invitation.event.requirements[0]?.dailyRateCents ??
      freelancer.dailyRateCents ??
      0;

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      const contract = await tx.contract.create({
        data: {
          eventId: invitation.eventId,
          companyId: invitation.companyId,
          freelancerId: freelancer.id,
          invitationId: invitation.id,
          status: ContractStatus.PENDING_PAYMENT,
          amountCents,
          platformFeeCents: Math.round(amountCents * 0.08),
          startsAt: invitation.event.startsAt,
          endsAt: invitation.event.endsAt,
        },
      });

      await tx.chatThread.updateMany({
        where: { invitationId: invitation.id },
        data: { contractId: contract.id },
      });

      await tx.notification.create({
        data: {
          userId: invitation.company.userId,
          type: "INVITATION_ACCEPTED",
          title: "Convite aceito",
          body: `${freelancer.displayName ?? "Profissional"} aceitou o convite para ${invitation.event.name}.`,
        },
      });

      return { invitation: updatedInvitation, contract };
    });
  }

  async decline(userId: string, invitationId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const invitation = await this.findInvitationForFreelancer(
      invitationId,
      freelancer.id,
    );

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: invitation.company.userId,
          type: "INVITATION_DECLINED",
          title: "Convite recusado",
          body: `${freelancer.displayName ?? "Profissional"} recusou o convite para ${invitation.event.name}.`,
        },
      });

      return updatedInvitation;
    });
  }

  private async findInvitationForFreelancer(
    invitationId: string,
    freelancerId: string,
  ) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, freelancerId },
      include: {
        company: true,
        event: { include: { requirements: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    return invitation;
  }

  private async hasBlockedAvailability(
    freelancerId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const count = await this.prisma.availability.count({
      where: {
        freelancerId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        isAvailable: false,
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
