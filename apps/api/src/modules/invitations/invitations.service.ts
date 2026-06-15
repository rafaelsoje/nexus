import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ContractStatus,
  EventStatus,
  InvitationStatus,
  Prisma,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import {
  publicCompanySelect,
  publicFreelancerSelect,
} from "../../common/selectors/public-profiles";
import { ContractsService } from "../contracts/contracts.service";
import { calculatePlatformFeeCents } from "../payments/fees";
import {
  CompanyAccessService,
  companyOperateRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBulkInvitationDto } from "./dto/create-bulk-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { NegotiateInvitationAmountDto } from "./dto/negotiate-invitation-amount.dto";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
    private readonly config: ConfigService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async create(userId: string, dto: CreateInvitationDto) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    this.assertCompanyVerified(company);
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, companyId: company.id },
      include: { requirements: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    this.assertEventOpenForHiring(event);
    await this.assertEventHasOpenSpot(event.id);

    const freelancer = await this.prisma.freelancerProfile.findFirst({
      where: { id: dto.freelancerId, user: { isActive: true } },
      include: { skills: true },
    });

    if (!freelancer) {
      throw new NotFoundException("Freelancer not found");
    }

    this.assertFreelancerVerified(freelancer);

    if (new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException(
        "Invitation expiration must be in the future",
      );
    }

    const eventRequirement = this.resolveInvitationRequirement(
      freelancer,
      event.requirements,
      dto.eventRequirementId,
    );

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
        eventRequirementId: eventRequirement.id,
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
      const proposedAmountCents =
        dto.proposedAmountCents ??
        eventRequirement.dailyRateCents ??
        freelancer.dailyRateCents;
      const invitation = await tx.invitation.create({
        data: {
          eventId: event.id,
          companyId: company.id,
          freelancerId: freelancer.id,
          eventRequirementId: eventRequirement.id,
          expiresAt: new Date(dto.expiresAt),
          message: dto.message,
          proposedAmountCents,
        },
        include: {
          event: { include: { requirements: { include: { skill: true } } } },
          eventRequirement: { include: { skill: true } },
          freelancer: { select: publicFreelancerSelect },
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
          eventRequirementId: dto.eventRequirementId,
          expiresAt: dto.expiresAt,
          message: dto.message,
          proposedAmountCents: dto.proposedAmountCents,
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
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    return this.prisma.invitation.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        eventRequirement: { include: { skill: true } },
        freelancer: { select: publicFreelancerSelect },
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
        eventRequirement: { include: { skill: true } },
        company: {
          select: publicCompanySelect,
        },
      },
    });
  }

  async cancel(userId: string, invitationId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, companyId: company.id },
      include: { event: true, freelancer: true },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      return invitation;
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Only pending invitations can be cancelled");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.CANCELLED,
          respondedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: invitation.freelancer.userId,
          type: "INVITATION_CANCELLED",
          title: "Convite cancelado",
          body: `${company.companyName} cancelou o convite para ${invitation.event.name}.`,
        },
      });

      return updatedInvitation;
    });
  }

  async accept(userId: string, invitationId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    this.assertFreelancerVerified(freelancer);
    const invitation = await this.findInvitationForFreelancer(
      invitationId,
      freelancer.id,
    );

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    this.assertCompanyVerified(invitation.company);

    if (invitation.expiresAt <= new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException("Invitation expired");
    }

    this.assertEventOpenForHiring(invitation.event);
    await this.assertEventHasOpenSpot(invitation.eventId);

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
      invitation.agreedAmountCents ??
      invitation.counterAmountCents ??
      invitation.proposedAmountCents ??
      invitation.eventRequirement?.dailyRateCents ??
      freelancer.dailyRateCents ??
      0;

    return this.prisma.$transaction(async (tx) => {
      await this.lockHiringRows(tx, invitation.eventId, freelancer.id);
      await this.assertEventHasOpenSpot(invitation.eventId, tx);
      await this.assertFreelancerCanWork(
        freelancer.id,
        invitation.event.startsAt,
        invitation.event.endsAt,
        tx,
      );

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
          platformFeeCents: calculatePlatformFeeCents(amountCents, this.config),
          startsAt: invitation.event.startsAt,
          endsAt: invitation.event.endsAt,
        },
      });

      await tx.chatThread.updateMany({
        where: { invitationId: invitation.id },
        data: { contractId: contract.id },
      });

      await this.companyAccess.notifyCompanyMembers(tx, invitation.companyId, {
        type: "INVITATION_ACCEPTED",
        title: "Convite aceito",
        body: `${freelancer.displayName ?? "Profissional"} aceitou o convite para ${invitation.event.name}.`,
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

      await this.companyAccess.notifyCompanyMembers(tx, invitation.companyId, {
        type: "INVITATION_DECLINED",
        title: "Convite recusado",
        body: `${freelancer.displayName ?? "Profissional"} recusou o convite para ${invitation.event.name}.`,
      });

      return updatedInvitation;
    });
  }

  async proposeAmount(
    userId: string,
    invitationId: string,
    dto: NegotiateInvitationAmountDto,
  ) {
    const { invitation, user } = await this.findParticipantInvitation(
      userId,
      invitationId,
    );

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    const isCompany = user.role === UserRole.COMPANY;
    const body =
      dto.message?.trim() ||
      `${user.name} propôs ${this.formatCents(dto.amountCents)} para este convite.`;

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: isCompany
          ? {
              proposedAmountCents: dto.amountCents,
              agreedAmountCents: null,
            }
          : {
              counterAmountCents: dto.amountCents,
              agreedAmountCents: null,
        },
        include: {
          event: { include: { requirements: { include: { skill: true } } } },
          eventRequirement: { include: { skill: true } },
          company: {
            select: {
              id: true,
              companyName: true,
              city: true,
              state: true,
            },
          },
          freelancer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      const chatThread = await tx.chatThread.findFirst({
        where: { invitationId: invitation.id },
      });

      if (chatThread) {
        await tx.chatMessage.create({
          data: {
            threadId: chatThread.id,
            senderId: user.id,
            body,
          },
        });

        await tx.chatThread.update({
          where: { id: chatThread.id },
          data: { updatedAt: new Date() },
        });
      }

      if (isCompany) {
        await tx.notification.create({
          data: {
            userId: invitation.freelancer.userId,
            type: "INVITATION_AMOUNT_PROPOSED",
            title: "Nova proposta de valor",
            body,
          },
        });
      } else {
        await this.companyAccess.notifyCompanyMembers(
          tx,
          invitation.companyId,
          {
            type: "INVITATION_AMOUNT_PROPOSED",
            title: "Nova proposta de valor",
            body,
          },
        );
      }

      return updatedInvitation;
    });
  }

  async acceptAmount(userId: string, invitationId: string) {
    const { invitation, user } = await this.findParticipantInvitation(
      userId,
      invitationId,
    );

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    const isCompany = user.role === UserRole.COMPANY;
    const amountCents = isCompany
      ? invitation.counterAmountCents
      : invitation.proposedAmountCents;

    if (amountCents === null || amountCents === undefined) {
      throw new BadRequestException("No amount proposal to accept");
    }

    const body = `${user.name} aceitou ${this.formatCents(amountCents)} para este convite.`;

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: { agreedAmountCents: amountCents },
        include: {
          event: { include: { requirements: { include: { skill: true } } } },
          eventRequirement: { include: { skill: true } },
          company: {
            select: {
              id: true,
              companyName: true,
              city: true,
              state: true,
            },
          },
          freelancer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      const chatThread = await tx.chatThread.findFirst({
        where: { invitationId: invitation.id },
      });

      if (chatThread) {
        await tx.chatMessage.create({
          data: {
            threadId: chatThread.id,
            senderId: user.id,
            body,
          },
        });

        await tx.chatThread.update({
          where: { id: chatThread.id },
          data: { updatedAt: new Date() },
        });
      }

      if (isCompany) {
        await tx.notification.create({
          data: {
            userId: invitation.freelancer.userId,
            type: "INVITATION_AMOUNT_ACCEPTED",
            title: "Valor acordado",
            body,
          },
        });
      } else {
        await this.companyAccess.notifyCompanyMembers(
          tx,
          invitation.companyId,
          {
            type: "INVITATION_AMOUNT_ACCEPTED",
            title: "Valor acordado",
            body,
          },
        );
      }

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
        eventRequirement: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    return invitation;
  }

  private async findParticipantInvitation(
    userId: string,
    invitationId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (
      !user ||
      (user.role !== UserRole.COMPANY && user.role !== UserRole.FREELANCER)
    ) {
      throw new ForbiddenException("Invitation negotiation is unavailable");
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        OR: [
          { company: { members: { some: { userId, isActive: true } } } },
          { freelancer: { userId } },
        ],
      },
      include: {
        company: true,
        freelancer: true,
        event: true,
        eventRequirement: { include: { skill: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    return { invitation, user };
  }

  private formatCents(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  }

  private async hasBlockedAvailability(
    freelancerId: string,
    startsAt: Date,
    endsAt: Date,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const count = await db.availability.count({
      where: {
        freelancerId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        isAvailable: false,
      },
    });

    return count > 0;
  }

  private async lockHiringRows(
    tx: Prisma.TransactionClient,
    eventId: string,
    freelancerId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "FreelancerProfile" WHERE id = ${freelancerId} FOR UPDATE`;
  }

  private assertCompanyVerified(company: {
    verificationStatus: VerificationStatus;
  }) {
    if (company.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Company must be verified");
    }
  }

  private assertFreelancerVerified(freelancer: {
    verificationStatus: VerificationStatus;
  }) {
    if (freelancer.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Freelancer must be verified");
    }
  }

  private async assertFreelancerCanWork(
    freelancerId: string,
    startsAt: Date,
    endsAt: Date,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const [contractCount, availabilityCount] = await Promise.all([
      db.contract.count({
        where: {
          freelancerId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          status: {
            in: [ContractStatus.PENDING_PAYMENT, ContractStatus.CONFIRMED],
          },
        },
      }),
      db.availability.count({
        where: {
          freelancerId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          isAvailable: false,
        },
      }),
    ]);

    if (contractCount > 0) {
      throw new BadRequestException(
        "Freelancer already has a contract in this time range",
      );
    }

    if (availabilityCount > 0) {
      throw new BadRequestException(
        "Freelancer is unavailable in this time range",
      );
    }
  }

  private assertEventOpenForHiring(event: {
    startsAt: Date;
    status: EventStatus;
  }) {
    if (
      event.startsAt <= new Date() ||
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.FINISHED
    ) {
      throw new BadRequestException("Event is not open for invitations");
    }
  }

  private resolveInvitationRequirement(
    freelancer: { skills: Array<{ skillId: string }> },
    requirements: Array<{
      id: string;
      skillId: string;
      dailyRateCents: number | null;
    }>,
    eventRequirementId: string,
  ) {
    const selectedRequirement = requirements.find(
      (item) => item.id === eventRequirementId,
    );

    if (!selectedRequirement) {
      throw new BadRequestException("Invitation requirement is required");
    }

    const freelancerSkillIds = new Set(
      freelancer.skills.map((item) => item.skillId),
    );

    if (!freelancerSkillIds.has(selectedRequirement.skillId)) {
      throw new BadRequestException(
        "Freelancer does not match event requirements",
      );
    }

    return selectedRequirement;
  }

  private async assertEventHasOpenSpot(
    eventId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        contracts: {
          where: {
            status: {
              notIn: [ContractStatus.CANCELLED, ContractStatus.NO_SHOW],
            },
          },
          select: { id: true },
        },
      },
    });

    if (!event || event.contracts.length >= event.desiredProfessionals) {
      throw new BadRequestException("Event has no open spots");
    }
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
