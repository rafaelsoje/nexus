import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApplicationStatus,
  ContractStatus,
  EventStatus,
  InvitationStatus,
  Prisma,
  VerificationStatus,
} from "@prisma/client";
import {
  publicCompanySelect,
  publicFreelancerSelect,
} from "../../common/selectors/public-profiles";
import { PrismaService } from "../prisma/prisma.service";
import { calculatePlatformFeeCents } from "../payments/fees";
import {
  CompanyAccessService,
  companyOperateRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { SearchOpportunitiesDto } from "./dto/search-opportunities.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async listOpportunities(userId: string, query: SearchOpportunitiesDto = {}) {
    const freelancer = await this.findFreelancerByUserId(userId);
    this.assertFreelancerVerified(freelancer);
    const skillIds = freelancer.skills.map((item) => item.skillId);
    const requestedSkillIds = query.skillId
      ? skillIds.includes(query.skillId)
        ? [query.skillId]
        : []
      : skillIds;
    const normalizedCompanySearch = query.companySearch?.trim();
    const normalizedEventType = query.eventType?.trim();
    const now = new Date();

    if (!requestedSkillIds.length) {
      return [];
    }

    const events = await this.prisma.event.findMany({
      where: {
        startsAt: { gt: now },
        status: { notIn: [EventStatus.CANCELLED, EventStatus.FINISHED] },
        company: {
          user: { isActive: true },
          verificationStatus: VerificationStatus.VERIFIED,
          OR: normalizedCompanySearch
            ? [
                {
                  companyName: {
                    contains: normalizedCompanySearch,
                    mode: "insensitive",
                  },
                },
                {
                  city: {
                    contains: normalizedCompanySearch,
                    mode: "insensitive",
                  },
                },
              ]
            : undefined,
        },
        eventType: normalizedEventType
          ? { contains: normalizedEventType, mode: "insensitive" }
          : undefined,
        requirements: requestedSkillIds.length
          ? {
              some: {
                skillId: { in: requestedSkillIds },
                dailyRateCents: {
                  gte: query.minDailyRateCents,
                  lte: query.maxDailyRateCents,
                },
              },
            }
          : undefined,
        applications: { none: { freelancerId: freelancer.id } },
        invitations: {
          none: {
            freelancerId: freelancer.id,
            status: {
              in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED],
            },
          },
        },
        contracts: { none: { freelancerId: freelancer.id } },
      },
      orderBy: { startsAt: "asc" },
      include: {
        company: {
          select: publicCompanySelect,
        },
        requirements: { include: { skill: true } },
        contracts: true,
      },
    });

    const compatibleEvents = events
      .map((event) => ({
        ...event,
        requirements: event.requirements.filter((item) =>
          requestedSkillIds.includes(item.skillId) &&
          this.matchesDailyRateFilter(
            item.dailyRateCents,
            query.minDailyRateCents,
            query.maxDailyRateCents,
          ),
        ),
        openSpots: Math.max(
          event.desiredProfessionals - event.contracts.length,
          0,
        ),
      }))
      .filter((event) => event.openSpots > 0);

    const availability = await Promise.all(
      compatibleEvents.map(async (event) => ({
        event,
        canWork: await this.canFreelancerWork(
          freelancer.id,
          event.startsAt,
          event.endsAt,
        ),
      })),
    );

    return availability
      .filter((item) => item.canWork)
      .map((item) => item.event);
  }

  async listMine(userId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);

    return this.prisma.application.findMany({
      where: { freelancerId: freelancer.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        eventRequirement: { include: { skill: true } },
        company: {
          select: publicCompanySelect,
        },
        contract: true,
      },
    });
  }

  async listReceived(userId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );

    return this.prisma.application.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        eventRequirement: { include: { skill: true } },
        freelancer: {
          select: publicFreelancerSelect,
        },
        contract: true,
      },
    });
  }

  async create(userId: string, dto: CreateApplicationDto) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: {
        company: { include: { user: { select: { isActive: true } } } },
        requirements: true,
        contracts: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (!event.company.user.isActive) {
      throw new BadRequestException("Event is not open for applications");
    }

    this.assertFreelancerVerified(freelancer);
    this.assertCompanyVerified(event.company);

    if (event.startsAt <= new Date()) {
      throw new BadRequestException("Event is not open for applications");
    }

    if (
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.FINISHED
    ) {
      throw new BadRequestException("Event is not open for applications");
    }

    if (event.contracts.length >= event.desiredProfessionals) {
      throw new BadRequestException("Event has no open spots");
    }

    await this.assertFreelancerCanApply(freelancer.id, event);
    const eventRequirement = this.resolveApplicationRequirement(
      freelancer,
      event,
      dto.eventRequirementId,
    );

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          eventId: event.id,
          companyId: event.companyId,
          freelancerId: freelancer.id,
          eventRequirementId: eventRequirement?.id,
          message: dto.message,
          proposedAmountCents: dto.proposedAmountCents,
        },
        include: {
          event: true,
          company: { select: { companyName: true } },
        },
      });

      await tx.chatThread.create({
        data: {
          eventId: event.id,
          companyId: event.companyId,
          freelancerId: freelancer.id,
          applicationId: application.id,
        },
      });

      await this.companyAccess.notifyCompanyMembers(tx, event.companyId, {
        type: "APPLICATION_RECEIVED",
        title: "Nova candidatura recebida",
        body: `${freelancer.displayName ?? "Profissional"} se candidatou para ${event.name}.`,
      });

      return application;
    });
  }

  async updateMine(
    userId: string,
    applicationId: string,
    dto: UpdateApplicationDto,
  ) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, freelancerId: freelancer.id },
      include: { event: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException("Only pending applications can be updated");
    }

    if (application.event.startsAt <= new Date()) {
      throw new BadRequestException("Event is not open for applications");
    }

    return this.prisma.application.update({
      where: { id: application.id },
      data: {
        message: dto.message,
        proposedAmountCents: dto.proposedAmountCents,
      },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        eventRequirement: { include: { skill: true } },
        company: { select: publicCompanySelect },
        contract: true,
      },
    });
  }

  async cancelMine(userId: string, applicationId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, freelancerId: freelancer.id },
      include: { event: true, company: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    if (application.status === ApplicationStatus.CANCELLED) {
      return application;
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException("Only pending applications can be cancelled");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.CANCELLED,
          respondedAt: new Date(),
        },
      });

      await this.companyAccess.notifyCompanyMembers(tx, application.companyId, {
        type: "APPLICATION_CANCELLED",
        title: "Candidatura cancelada",
        body: `${freelancer.displayName ?? "Profissional"} cancelou a candidatura para ${application.event.name}.`,
      });

      return updatedApplication;
    });
  }

  async accept(userId: string, applicationId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    this.assertCompanyVerified(company);
    const application = await this.findApplicationForCompany(
      applicationId,
      company.id,
    );

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.DECLINED
    ) {
      throw new BadRequestException("Application is not pending");
    }

    this.assertFreelancerVerified(application.freelancer);

    await this.assertEventHasOpenSpot(application.eventId);
    await this.assertFreelancerCanWork(
      application.freelancerId,
      application.event.startsAt,
      application.event.endsAt,
    );

    const amountCents =
      application.proposedAmountCents ??
      application.eventRequirement?.dailyRateCents ??
      application.event.requirements[0]?.dailyRateCents ??
      application.freelancer.dailyRateCents ??
      0;

    return this.prisma.$transaction(async (tx) => {
      await this.lockHiringRows(
        tx,
        application.eventId,
        application.freelancerId,
      );
      await this.assertEventHasOpenSpot(application.eventId, tx);
      await this.assertFreelancerCanWork(
        application.freelancerId,
        application.event.startsAt,
        application.event.endsAt,
        tx,
      );

      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      const contract = await tx.contract.create({
        data: {
          eventId: application.eventId,
          companyId: application.companyId,
          freelancerId: application.freelancerId,
          applicationId: application.id,
          status: ContractStatus.PENDING_PAYMENT,
          amountCents,
          platformFeeCents: calculatePlatformFeeCents(amountCents, this.config),
          startsAt: application.event.startsAt,
          endsAt: application.event.endsAt,
        },
      });

      await tx.chatThread.updateMany({
        where: { applicationId: application.id },
        data: { contractId: contract.id },
      });

      await tx.notification.create({
        data: {
          userId: application.freelancer.userId,
          type: "APPLICATION_ACCEPTED",
          title: "Candidatura aprovada",
          body: `${company.companyName} aprovou sua candidatura para ${application.event.name}.`,
        },
      });

      return { application: updatedApplication, contract };
    });
  }

  async decline(userId: string, applicationId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    const application = await this.findApplicationForCompany(
      applicationId,
      company.id,
    );

    if (application.status === ApplicationStatus.DECLINED) {
      return application;
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException("Application is not pending");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: application.freelancer.userId,
          type: "APPLICATION_DECLINED",
          title: "Candidatura recusada",
          body: `${company.companyName} recusou sua candidatura para ${application.event.name}.`,
        },
      });

      return updatedApplication;
    });
  }

  private async assertFreelancerCanApply(
    freelancerId: string,
    event: {
      id: string;
      startsAt: Date;
      endsAt: Date;
      requirements: Array<{ skillId: string }>;
    },
  ) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { id: freelancerId },
      include: { skills: true },
    });
    if (!freelancer) {
      throw new NotFoundException("Freelancer not found");
    }

    this.assertFreelancerVerified(freelancer);

    const freelancerSkillIds = new Set(
      freelancer.skills.map((item) => item.skillId),
    );
    const matchesRequirement =
      event.requirements.length === 0 ||
      event.requirements.some((item) => freelancerSkillIds.has(item.skillId));

    if (!matchesRequirement) {
      throw new BadRequestException(
        "Freelancer does not match event requirements",
      );
    }

    const existingApplication = await this.prisma.application.findUnique({
      where: {
        eventId_freelancerId: {
          eventId: event.id,
          freelancerId,
        },
      },
    });

    if (existingApplication) {
      throw new BadRequestException("Application already exists");
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        eventId: event.id,
        freelancerId,
        status: { in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED] },
      },
    });

    if (existingInvitation) {
      throw new BadRequestException(
        "Freelancer already has an active invitation for this event",
      );
    }

    await this.assertFreelancerCanWork(
      freelancerId,
      event.startsAt,
      event.endsAt,
    );
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

  private async canFreelancerWork(
    freelancerId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const [contractCount, availabilityCount] = await Promise.all([
      this.prisma.contract.count({
        where: {
          freelancerId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          status: {
            in: [ContractStatus.PENDING_PAYMENT, ContractStatus.CONFIRMED],
          },
        },
      }),
      this.prisma.availability.count({
        where: {
          freelancerId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          isAvailable: false,
        },
      }),
    ]);

    return contractCount === 0 && availabilityCount === 0;
  }

  private matchesDailyRateFilter(
    amountCents: number | null,
    minDailyRateCents?: number,
    maxDailyRateCents?: number,
  ) {
    if (amountCents === null) {
      return minDailyRateCents === undefined && maxDailyRateCents === undefined;
    }

    if (minDailyRateCents !== undefined && amountCents < minDailyRateCents) {
      return false;
    }

    if (maxDailyRateCents !== undefined && amountCents > maxDailyRateCents) {
      return false;
    }

    return true;
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

  private async findApplicationForCompany(
    applicationId: string,
    companyId: string,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, companyId },
      include: {
        event: { include: { requirements: true } },
        eventRequirement: true,
        freelancer: true,
      },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    return application;
  }

  private resolveApplicationRequirement(
    freelancer: {
      skills: Array<{ skillId: string }>;
    },
    event: {
      requirements: Array<{ id: string; skillId: string }>;
    },
    eventRequirementId?: string,
  ) {
    const freelancerSkillIds = new Set(
      freelancer.skills.map((item) => item.skillId),
    );
    const matchingRequirements = event.requirements.filter((item) =>
      freelancerSkillIds.has(item.skillId),
    );

    if (!matchingRequirements.length) {
      throw new BadRequestException(
        "Freelancer does not match event requirements",
      );
    }

    if (!eventRequirementId) {
      return matchingRequirements[0];
    }

    const selectedRequirement = matchingRequirements.find(
      (item) => item.id === eventRequirementId,
    );

    if (!selectedRequirement) {
      throw new BadRequestException(
        "Freelancer does not match event requirements",
      );
    }

    return selectedRequirement;
  }

  private async findFreelancerByUserId(userId: string) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { skills: true },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return freelancer;
  }
}
