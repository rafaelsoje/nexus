import { Injectable, NotFoundException } from "@nestjs/common";
import { VerificationStatus } from "@prisma/client";
import { publicFreelancerSelect } from "../../common/selectors/public-profiles";
import { PrismaService } from "../prisma/prisma.service";
import { SetFreelancerSkillsDto } from "./dto/set-freelancer-skills.dto";
import { UpsertFreelancerProfileDto } from "./dto/upsert-freelancer-profile.dto";

@Injectable()
export class FreelancersService {
  constructor(private readonly prisma: PrismaService) {}

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
        skills: { include: { skill: true } },
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!profile) {
      throw new NotFoundException("Freelancer profile not found");
    }

    return profile;
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

  listPublicProfiles() {
    return this.prisma.freelancerProfile.findMany({
      where: {
        user: { isActive: true },
        verificationStatus: VerificationStatus.VERIFIED,
      },
      orderBy: { createdAt: "desc" },
      select: publicFreelancerSelect,
    });
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
}
