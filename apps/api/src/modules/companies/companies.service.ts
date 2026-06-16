import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CompanyInvitationStatus,
  CompanyMemberRole,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { publicCompanySelect } from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyManageRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { UpsertCompanyProfileDto } from "./dto/upsert-company-profile.dto";
import { PrismaService } from "../prisma/prisma.service";
import { InviteCompanyMemberDto } from "./dto/invite-company-member.dto";
import { AcceptCompanyInvitationDto } from "./dto/accept-company-invitation.dto";
import { UpdateCompanyLogoDto } from "./dto/update-company-logo.dto";
import { UpdateCompanyMemberProfileDto } from "./dto/update-company-member-profile.dto";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async upsertMyProfile(userId: string, dto: UpsertCompanyProfileDto) {
    const ownedProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (ownedProfile) {
      await this.companyAccess.findMembership(userId, companyManageRoles);
      return this.prisma.companyProfile.update({
        where: { id: ownedProfile.id },
        data: dto,
      });
    }

    const existingMembership = await this.prisma.companyMember.findFirst({
      where: { userId, isActive: true },
    });

    if (existingMembership) {
      throw new ConflictException("User already belongs to a company");
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.companyProfile.create({
        data: {
          ...dto,
          userId,
          wallet: { create: {} },
        },
      });

      await tx.companyMember.create({
        data: {
          companyId: profile.id,
          userId,
          role: CompanyMemberRole.OWNER,
        },
      });

      return profile;
    });
  }

  async findMyPrivateProfile(userId: string) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyReadRoles,
    );
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: membership.companyId },
      include: {
        wallet: true,
        members: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true, email: true, isActive: true },
            },
          },
        },
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!profile) {
      throw new NotFoundException("Company profile not found");
    }

    return profile;
  }

  async updateMyLogo(userId: string, dto: UpdateCompanyLogoDto) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );

    await this.prisma.companyProfile.update({
      where: { id: membership.companyId },
      data: { logoUrl: dto.logoUrl },
    });

    return this.findMyPrivateProfile(userId);
  }

  async listTeam(userId: string) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );

    const [members, invitations] = await Promise.all([
      this.prisma.companyMember.findMany({
        where: { companyId: membership.companyId },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.companyInvitation.findMany({
        where: {
          companyId: membership.companyId,
          status: CompanyInvitationStatus.PENDING,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    return { members, invitations };
  }

  async inviteMember(userId: string, dto: InviteCompanyMemberDto) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );
    const normalizedEmail = dto.email.trim().toLowerCase();

    if (dto.role === CompanyMemberRole.OWNER) {
      throw new BadRequestException("Owner role cannot be invited");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { companyMemberships: true },
    });

    if (existingUser?.companyMemberships.some((item) => item.isActive)) {
      throw new ConflictException("User already belongs to a company");
    }

    const token = randomBytes(32).toString("hex");
    const invitation = await this.prisma.companyInvitation.create({
      data: {
        companyId: membership.companyId,
        email: normalizedEmail,
        role: dto.role,
        tokenHash: this.hashToken(token),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return { ...invitation, token };
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );
    const invitation = await this.prisma.companyInvitation.findFirst({
      where: { id: invitationId, companyId: membership.companyId },
    });

    if (!invitation) {
      throw new NotFoundException("Company invitation not found");
    }

    if (invitation.status !== CompanyInvitationStatus.PENDING) {
      throw new BadRequestException("Only pending invitations can be cancelled");
    }

    return this.prisma.companyInvitation.update({
      where: { id: invitation.id },
      data: { status: CompanyInvitationStatus.CANCELLED },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async updateMemberRole(
    userId: string,
    memberId: string,
    role: CompanyMemberRole,
  ) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );

    if (role === CompanyMemberRole.OWNER) {
      throw new BadRequestException("Owner role cannot be assigned here");
    }

    const member = await this.findManagedMember(membership.companyId, memberId);

    if (member.role === CompanyMemberRole.OWNER) {
      throw new BadRequestException("Owner role cannot be changed");
    }

    return this.prisma.companyMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async updateMemberProfile(
    userId: string,
    memberId: string,
    dto: UpdateCompanyMemberProfileDto,
  ) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );
    const member = await this.findManagedMember(membership.companyId, memberId);

    if (!member.isActive) {
      throw new BadRequestException("Inactive members cannot be updated");
    }

    const name = dto.name?.trim();
    const phone = dto.phone?.trim();
    const avatarUrl = dto.avatarUrl?.trim();

    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Member name is required");
    }

    await this.prisma.user.update({
      where: { id: member.userId },
      data: {
        ...(dto.name !== undefined ? { name } : {}),
        ...(dto.phone !== undefined ? { phone: phone || null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
    });

    return this.prisma.companyMember.findUniqueOrThrow({
      where: { id: member.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async deactivateMember(userId: string, memberId: string) {
    const membership = await this.companyAccess.findMembership(
      userId,
      companyManageRoles,
    );
    const member = await this.findManagedMember(membership.companyId, memberId);

    if (member.role === CompanyMemberRole.OWNER) {
      throw new BadRequestException("Owner cannot be removed");
    }

    return this.prisma.companyMember.update({
      where: { id: member.id },
      data: { isActive: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async acceptInvitation(dto: AcceptCompanyInvitationDto) {
    const invitation = await this.prisma.companyInvitation.findFirst({
      where: {
        tokenHash: this.hashToken(dto.token),
        status: CompanyInvitationStatus.PENDING,
      },
      include: { company: true },
    });

    if (!invitation || invitation.expiresAt <= new Date()) {
      throw new BadRequestException("Invalid or expired company invitation");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      include: { companyMemberships: true },
    });

    if (existingUser && existingUser.role !== UserRole.COMPANY) {
      throw new ConflictException(
        "User already belongs to another account type",
      );
    }

    if (existingUser?.companyMemberships.some((item) => item.isActive)) {
      throw new ConflictException("User already belongs to a company");
    }

    return this.prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            name: dto.name,
            email: invitation.email,
            phone: dto.phone,
            role: UserRole.COMPANY,
            passwordHash: await bcrypt.hash(dto.password, 12),
          },
        }));

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: dto.name,
            phone: dto.phone,
            passwordHash: await bcrypt.hash(dto.password, 12),
          },
        });
      }

      const member = await tx.companyMember.create({
        data: {
          companyId: invitation.companyId,
          userId: user.id,
          role: invitation.role,
        },
      });

      await tx.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: CompanyInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return {
        ok: true,
        company: invitation.company.companyName,
        email: invitation.email,
        role: member.role,
      };
    });
  }

  private async findManagedMember(companyId: string, memberId: string) {
    const member = await this.prisma.companyMember.findFirst({
      where: { id: memberId, companyId },
    });

    if (!member) {
      throw new NotFoundException("Company member not found");
    }

    return member;
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
        verificationDocuments: { orderBy: { createdAt: "desc" } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, isActive: true },
            },
          },
        },
      },
    });
  }

  async findPublicProfile(id: string) {
    const profile = await this.prisma.companyProfile.findFirst({
      where: {
        id,
        user: { isActive: true },
      },
      select: publicCompanySelect,
    });

    if (!profile) {
      throw new NotFoundException("Company profile not found");
    }

    return profile;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
