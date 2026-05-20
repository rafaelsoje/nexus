import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ApplicationStatus,
  ContractStatus,
  EventStatus,
  InvitationStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOpportunities(userId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const skillIds = freelancer.skills.map((item) => item.skillId);
    const now = new Date();

    const events = await this.prisma.event.findMany({
      where: {
        startsAt: { gt: now },
        status: { notIn: [EventStatus.CANCELLED, EventStatus.FINISHED] },
        requirements: skillIds.length
          ? { some: { skillId: { in: skillIds } } }
          : undefined,
        applications: { none: { freelancerId: freelancer.id } },
        invitations: {
          none: {
            freelancerId: freelancer.id,
            status: { in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED] },
          },
        },
        contracts: { none: { freelancerId: freelancer.id } },
      },
      orderBy: { startsAt: "asc" },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
            ratingAverage: true,
          },
        },
        requirements: { include: { skill: true } },
        contracts: true,
      },
    });

    return events
      .map((event) => ({
        ...event,
        openSpots: Math.max(
          event.desiredProfessionals - event.contracts.length,
          0,
        ),
      }))
      .filter((event) => event.openSpots > 0);
  }

  async listMine(userId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);

    return this.prisma.application.findMany({
      where: { freelancerId: freelancer.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        company: {
          select: { id: true, companyName: true, city: true, state: true },
        },
        contract: true,
      },
    });
  }

  async listReceived(userId: string) {
    const company = await this.findCompanyByUserId(userId);

    return this.prisma.application.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: { include: { requirements: { include: { skill: true } } } },
        freelancer: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            city: true,
            state: true,
            dailyRateCents: true,
            ratingAverage: true,
            tools: true,
            transportation: true,
            skills: { include: { skill: true } },
            user: { select: { name: true } },
          },
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
        company: true,
        requirements: true,
        contracts: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

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

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          eventId: event.id,
          companyId: event.companyId,
          freelancerId: freelancer.id,
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

      await tx.notification.create({
        data: {
          userId: event.company.userId,
          type: "APPLICATION_RECEIVED",
          title: "Nova candidatura recebida",
          body: `${freelancer.displayName ?? "Profissional"} se candidatou para ${event.name}.`,
        },
      });

      return application;
    });
  }

  async accept(userId: string, applicationId: string) {
    const company = await this.findCompanyByUserId(userId);
    const application = await this.findApplicationForCompany(
      applicationId,
      company.id,
    );

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException("Application is not pending");
    }

    await this.assertFreelancerCanWork(
      application.freelancerId,
      application.event.startsAt,
      application.event.endsAt,
    );

    const amountCents =
      application.proposedAmountCents ??
      application.event.requirements[0]?.dailyRateCents ??
      application.freelancer.dailyRateCents ??
      0;

    return this.prisma.$transaction(async (tx) => {
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
          platformFeeCents: Math.round(amountCents * 0.08),
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
    const company = await this.findCompanyByUserId(userId);
    const application = await this.findApplicationForCompany(
      applicationId,
      company.id,
    );

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
    const freelancerSkillIds = new Set(
      freelancer?.skills.map((item) => item.skillId) ?? [],
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
      throw new BadRequestException("Freelancer already has an active invitation for this event");
    }

    await this.assertFreelancerCanWork(freelancerId, event.startsAt, event.endsAt);
  }

  private async assertFreelancerCanWork(
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

  private async findApplicationForCompany(applicationId: string, companyId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, companyId },
      include: {
        event: { include: { requirements: true } },
        freelancer: true,
      },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    return application;
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
      include: { skills: true },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return freelancer;
  }
}
