import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole, VerificationStatus } from "@prisma/client";
import { publicFreelancerSelect } from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { SetFreelancerSkillsDto } from "./dto/set-freelancer-skills.dto";
import { UpdateFreelancerAvatarDto } from "./dto/update-freelancer-avatar.dto";
import { UpsertFreelancerProfileDto } from "./dto/upsert-freelancer-profile.dto";

@Injectable()
export class FreelancersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  upsertMyProfile(userId: string, dto: UpsertFreelancerProfileDto) {
    return this.prisma.freelancerProfile.upsert({
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
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        wallet: true,
        gatewayAccounts: { orderBy: { createdAt: "desc" } },
        skills: { include: { skill: true } },
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }

    return profile;
  }

  async updateMyAvatar(userId: string, dto: UpdateFreelancerAvatarDto) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }

    await this.prisma.freelancerProfile.update({
      where: { userId },
      data: { avatarUrl: dto.avatarUrl },
    });

    return this.findMyPrivateProfile(userId);
  }

  async setMySkills(userId: string, dto: SetFreelancerSkillsDto) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }

    await this.prisma.$transaction([
      this.prisma.freelancerSkill.deleteMany({
        where: { freelancerId: profile.id },
      }),
      ...dto.skills.map((item) =>
        this.prisma.freelancerSkill.create({
          data: {
            freelancerId: profile.id,
            skillId: item.skillId,
            dailyRateCents: item.dailyRateCents,
            knowledgeLevel: item.knowledgeLevel,
            experienceSummary: item.experienceSummary,
            equipment: item.equipment,
            courses: item.courses,
            abilities: item.abilities,
          },
        }),
      ),
    ]);

    return this.findMyPrivateProfile(userId);
  }

  async listPublicProfiles(userId?: string, role?: UserRole | string) {
    const company =
      userId && role === UserRole.COMPANY
        ? await this.companyAccess.findCompanyForUser(userId, companyReadRoles)
        : null;
    const freelancers = await this.prisma.freelancerProfile.findMany({
      where: {
        user: { isActive: true },
        verificationStatus: VerificationStatus.VERIFIED,
      },
      orderBy: { createdAt: "desc" },
      select: publicFreelancerSelect,
    });

    return this.withFavoriteFlag(freelancers, company?.id);
  }

  async listFavoriteFreelancers(userId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    const favorites = await this.prisma.companyFavoriteFreelancer.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: {
        freelancer: { select: publicFreelancerSelect },
      },
    });

    return favorites.map((favorite) => ({
      ...favorite.freelancer,
      isFavorite: true,
    }));
  }

  async favoriteFreelancer(userId: string, freelancerId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );
    await this.assertPublicFreelancerExists(freelancerId);

    await this.prisma.companyFavoriteFreelancer.upsert({
      where: {
        companyId_freelancerId: {
          companyId: company.id,
          freelancerId,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        freelancerId,
        createdById: userId,
      },
    });

    return { ok: true };
  }

  async unfavoriteFreelancer(userId: string, freelancerId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyReadRoles,
    );

    await this.prisma.companyFavoriteFreelancer.deleteMany({
      where: { companyId: company.id, freelancerId },
    });

    return { ok: true };
  }

  async findPublicProfile(id: string) {
    const profile = await this.prisma.freelancerProfile.findFirst({
      where: {
        id,
        user: { isActive: true },
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: publicFreelancerSelect,
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }

    return profile;
  }

  private async assertPublicFreelancerExists(freelancerId: string) {
    const profile = await this.prisma.freelancerProfile.findFirst({
      where: {
        id: freelancerId,
        user: { isActive: true },
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }
  }

  private async withFavoriteFlag<T extends { id: string }>(
    freelancers: T[],
    companyId?: string,
  ) {
    if (!companyId || !freelancers.length) {
      return freelancers.map((freelancer) => ({
        ...freelancer,
        isFavorite: false,
      }));
    }

    const favorites = await this.prisma.companyFavoriteFreelancer.findMany({
      where: {
        companyId,
        freelancerId: { in: freelancers.map((freelancer) => freelancer.id) },
      },
      select: { freelancerId: true },
    });
    const favoriteIds = new Set(favorites.map((item) => item.freelancerId));

    return freelancers
      .map((freelancer) => ({
        ...freelancer,
        isFavorite: favoriteIds.has(freelancer.id),
      }))
      .sort(
        (left, right) => Number(right.isFavorite) - Number(left.isFavorite),
      );
  }
}
