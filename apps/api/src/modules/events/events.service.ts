import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContractStatus,
  EventStatus,
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

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async create(userId: string, dto: CreateEventDto) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyOperateRoles,
    );
    this.assertCompanyVerified(company);
    this.assertValidRange(dto.startsAt, dto.endsAt);

    return this.prisma.event.create({
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

  async update(userId: string, eventId: string, dto: UpdateEventDto) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);
    const startsAt = dto.startsAt ?? event.startsAt.toISOString();
    const endsAt = dto.endsAt ?? event.endsAt.toISOString();
    this.assertValidRange(startsAt, endsAt);

    return this.prisma.$transaction(async (tx) => {
      if (dto.requirements) {
        await tx.eventRequirement.deleteMany({ where: { eventId: event.id } });
      }

      return tx.event.update({
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
    });
  }

  async duplicate(userId: string, eventId: string) {
    await this.companyAccess.findCompanyForUser(userId, companyOperateRoles);
    const event = await this.findMine(userId, eventId);

    return this.prisma.event.create({
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
  }

  async searchAvailableFreelancers(query: SearchAvailableFreelancersDto) {
    this.assertValidRange(query.startsAt, query.endsAt);
    const startsAt = new Date(query.startsAt);
    const endsAt = new Date(query.endsAt);
    const normalizedSearch = query.search?.trim();
    const normalizedTools = query.tools?.trim();
    const normalizedTransportation = query.transportation?.trim();

    const freelancers = await this.prisma.freelancerProfile.findMany({
      where: {
        user: { isActive: true },
        verificationStatus: VerificationStatus.VERIFIED,
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

    return freelancers
      .map((freelancer) => ({
        ...freelancer,
        isAvailable:
          freelancer.availability.length === 0 &&
          freelancer.contracts.length === 0,
        blockingReason:
          freelancer.contracts.length > 0
            ? "Já contratado no horário"
            : freelancer.availability[0]?.reason,
      }))
      .sort(
        (left, right) => Number(right.isAvailable) - Number(left.isAvailable),
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
}
