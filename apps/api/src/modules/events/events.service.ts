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
  Prisma,
  VerificationStatus,
} from "@prisma/client";
import { publicFreelancerSelect } from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyOperateRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { SearchAvailableFreelancersDto } from "./dto/search-available-freelancers.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

type AuditContext = {
  userId: string;
  role?: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async create(userId: string, dto: CreateEventDto, audit?: AuditContext) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    this.assertCompanyVerified(company);
    this.assertValidRange(dto.startsAt, dto.endsAt);

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          companyId: company.id,
          name: dto.name,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          location: dto.location,
          city: dto.city,
          state: dto.state,
          description: dto.description,
          eventType: dto.eventType,
          desiredProfessionals: dto.desiredProfessionals ?? 1,
          status: EventStatus.OPEN,
          requirements: {
            create: dto.requirements?.map((item) => ({
              skillId: item.skillId,
              quantity: item.quantity,
              dailyRateCents: item.dailyRateCents,
            })),
          },
        },
        include: { requirements: { include: { skill: true } } },
      });

      await this.auditEvent(tx, audit, "EVENT_CREATED", event.id, {
        companyId: company.id,
      });

      return event;
    });
  }

  async listMine(userId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    return this.prisma.event.findMany({
      where: { companyId: company.id },
      orderBy: { startsAt: "desc" },
      include: { requirements: { include: { skill: true } } },
    });
  }

  async findMine(userId: string, eventId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, companyId: company.id },
      include: {
        requirements: { include: { skill: true } },
        invitations: true,
        contracts: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async update(
    userId: string,
    eventId: string,
    dto: UpdateEventDto,
    audit?: AuditContext,
  ) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);
    const startsAt = dto.startsAt ?? event.startsAt.toISOString();
    const endsAt = dto.endsAt ?? event.endsAt.toISOString();
    this.assertValidRange(startsAt, endsAt);

    return this.prisma.$transaction(async (tx) => {
      if (dto.requirements) {
        await tx.eventRequirement.deleteMany({ where: { eventId: event.id } });
      }

      const updated = await tx.event.update({
        where: { id: event.id },
        data: {
          name: dto.name,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
          location: dto.location,
          city: dto.city,
          state: dto.state,
          description: dto.description,
          eventType: dto.eventType,
          desiredProfessionals: dto.desiredProfessionals,
          requirements: dto.requirements
            ? {
                create: dto.requirements.map((item) => ({
                  skillId: item.skillId,
                  quantity: item.quantity,
                  dailyRateCents: item.dailyRateCents,
                })),
              }
            : undefined,
        },
        include: { requirements: { include: { skill: true } } },
      });

      await this.auditEvent(tx, audit, "EVENT_UPDATED", event.id, {
        companyId: event.companyId,
      });

      return updated;
    });
  }

  async duplicate(userId: string, eventId: string, audit?: AuditContext) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);

    return this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.event.create({
        data: {
          companyId: event.companyId,
          name: `${event.name} (cópia)`,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          location: event.location,
          city: event.city,
          state: event.state,
          description: event.description,
          eventType: event.eventType,
          desiredProfessionals: event.desiredProfessionals,
          status: EventStatus.OPEN,
          requirements: {
            create: event.requirements.map((item) => ({
              skillId: item.skillId,
              quantity: item.quantity,
              dailyRateCents: item.dailyRateCents,
            })),
          },
        },
        include: { requirements: { include: { skill: true } } },
      });

      await this.auditEvent(tx, audit, "EVENT_DUPLICATED", duplicated.id, {
        companyId: event.companyId,
        sourceEventId: event.id,
      });

      return duplicated;
    });
  }

  async cancel(userId: string, eventId: string, audit?: AuditContext) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);

    if (event.status === EventStatus.CANCELLED) {
      return event;
    }

    const cancellableContractStatuses: ContractStatus[] = [
      ContractStatus.PENDING_PAYMENT,
      ContractStatus.CANCELLED,
      ContractStatus.NO_SHOW,
    ];
    const blockingContract = event.contracts.find(
      (contract) => !cancellableContractStatuses.includes(contract.status),
    );

    if (blockingContract) {
      throw new BadRequestException(
        "Event has contracts that must be handled before cancellation",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: { eventId: event.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.CANCELLED, respondedAt: new Date() },
      });

      await tx.application.updateMany({
        where: { eventId: event.id, status: ApplicationStatus.PENDING },
        data: { status: ApplicationStatus.CANCELLED, respondedAt: new Date() },
      });

      await tx.contract.updateMany({
        where: {
          eventId: event.id,
          status: ContractStatus.PENDING_PAYMENT,
        },
        data: { status: ContractStatus.CANCELLED },
      });

      const cancelled = await tx.event.update({
        where: { id: event.id },
        data: { status: EventStatus.CANCELLED },
        include: { requirements: { include: { skill: true } } },
      });

      await this.auditEvent(tx, audit, "EVENT_CANCELLED", event.id, {
        companyId: event.companyId,
      });

      return cancelled;
    });
  }

  async delete(userId: string, eventId: string, audit?: AuditContext) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);

    if (event.contracts.length > 0) {
      throw new BadRequestException("Event has contracts");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.event.delete({ where: { id: event.id } });
      await this.auditEvent(tx, audit, "EVENT_DELETED", event.id, {
        companyId: event.companyId,
      });
    });

    return { ok: true };
  }

  async searchAvailableFreelancers(
    userId: string,
    query: SearchAvailableFreelancersDto,
  ) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    this.assertValidRange(query.startsAt, query.endsAt);
    const startsAt = new Date(query.startsAt);
    const endsAt = new Date(query.endsAt);
    const normalizedSearch = query.search?.trim();
    const normalizedTools = query.tools?.trim();
    const normalizedTransportation = query.transportation?.trim();

    const freelancers = await this.prisma.freelancerProfile.findMany({
      where: {
        user: { isActive: true },
        verificationStatus: query.verificationStatus ?? VerificationStatus.VERIFIED,
        ratingAverage: query.minRating ? { gte: query.minRating } : undefined,
        city: query.city || undefined,
        dailyRateCents: {
          gte: query.minDailyRateCents,
          lte: query.maxDailyRateCents,
        },
        tools: normalizedTools
          ? { contains: normalizedTools, mode: "insensitive" }
          : undefined,
        transportation: normalizedTransportation
          ? { contains: normalizedTransportation, mode: "insensitive" }
          : undefined,
        OR: normalizedSearch
          ? [
              {
                displayName: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  name: { contains: normalizedSearch, mode: "insensitive" },
                },
              },
            ]
          : undefined,
        skills: query.skillId
          ? { some: { skillId: query.skillId } }
          : undefined,
      },
      select: {
        ...publicFreelancerSelect,
        availability: {
          where: {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            isAvailable: false,
          },
          select: { id: true, reason: true },
        },
        contracts: {
          where: {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            status: {
              in: [ContractStatus.PENDING_PAYMENT, ContractStatus.CONFIRMED],
            },
          },
          select: { id: true, status: true },
        },
      },
    });

    const favoriteRows = await this.prisma.companyFavoriteFreelancer.findMany({
      where: {
        companyId: company.id,
        freelancerId: { in: freelancers.map((freelancer) => freelancer.id) },
      },
      select: { freelancerId: true },
    });
    const favoriteIds = new Set(favoriteRows.map((item) => item.freelancerId));

    return freelancers
      .map((freelancer) => ({
        ...freelancer,
        isFavorite: favoriteIds.has(freelancer.id),
        isAvailable:
          freelancer.availability.length === 0 &&
          freelancer.contracts.length === 0,
        blockingReason:
          freelancer.contracts.length > 0
            ? "Já contratado no horário"
            : freelancer.availability[0]?.reason,
      }))
      .sort(
        (left, right) =>
          Number(right.isFavorite) - Number(left.isFavorite) ||
          Number(right.isAvailable) - Number(left.isAvailable),
      );
  }

  private assertValidRange(startsAt: string, endsAt: string) {
    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new BadRequestException("End must be after start");
    }
  }

  private assertCompanyVerified(company: {
    verificationStatus: VerificationStatus;
  }) {
    if (company.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Company must be verified");
    }
  }

  private auditEvent(
    db: Prisma.TransactionClient | PrismaService,
    audit: AuditContext | undefined,
    action: string,
    eventId: string,
    metadata?: Record<string, unknown>,
  ) {
    return db.auditLog.create({
      data: {
        userId: audit?.userId,
        role: audit?.role,
        ip: audit?.ip,
        userAgent: audit?.userAgent,
        action,
        entity: "Event",
        entityId: eventId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
