import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAvailabilityDto } from "./dto/create-availability.dto";

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.availability.findMany({
      where: { freelancerId: freelancer.id },
      orderBy: { startsAt: "asc" },
    });
  }

  async create(userId: string, dto: CreateAvailabilityDto) {
    const freelancer = await this.findFreelancerByUserId(userId);

    if (new Date(dto.startsAt) >= new Date(dto.endsAt)) {
      throw new BadRequestException("End must be after start");
    }

    return this.prisma.availability.create({
      data: {
        freelancerId: freelancer.id,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isAvailable: dto.isAvailable ?? false,
        reason: dto.reason,
      },
    });
  }

  async remove(userId: string, availabilityId: string) {
    const freelancer = await this.findFreelancerByUserId(userId);
    const availability = await this.prisma.availability.findFirst({
      where: { id: availabilityId, freelancerId: freelancer.id },
    });

    if (!availability) {
      throw new NotFoundException("Availability not found");
    }

    await this.prisma.availability.delete({ where: { id: availability.id } });
    return { ok: true };
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
