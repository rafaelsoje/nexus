import { Injectable, NotFoundException } from "@nestjs/common";
import { UpsertCompanyProfileDto } from "./dto/upsert-company-profile.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  upsertMyProfile(userId: string, dto: UpsertCompanyProfileDto) {
    return this.prisma.companyProfile.upsert({
      where: { userId },
      update: dto,
      create: {
        ...dto,
        userId,
        wallet: { create: {} },
      },
    });
  }

  async findMyPrivateProfile(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!profile) {
      throw new NotFoundException("Company profile not found");
    }

    return profile;
  }

  listForAdmin() {
    return this.prisma.companyProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }
}
