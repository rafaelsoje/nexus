import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, InvitationStatus } from "@prisma/client";
import { ContractsService } from "../contracts/contracts.service";
import { PrismaService } from "../prisma/prisma.service";
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

    return this.prisma.invitation.create({
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

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
  }

  private async findInvitationForFreelancer(
    invitationId: string,
    freelancerId: string,
  ) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, freelancerId },
      include: { event: { include: { requirements: true } } },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    return invitation;
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
