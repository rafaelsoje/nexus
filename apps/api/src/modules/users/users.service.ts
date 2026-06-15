import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, UserRole, VerificationStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import {
  DOCUMENT_STORAGE,
  DocumentStorage,
} from "../documents/storage/document-storage";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMyAccountDto } from "./dto/update-my-account.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE)
    private readonly documentStorage: DocumentStorage,
  ) {}

  async findPrivateProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        adminProfile: { select: { accessLevel: true } },
        companyProfile: true,
        freelancerProfile: {
          include: {
            skills: { include: { skill: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  listForAdmin() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateMyAccount(userId: string, dto: UpdateMyAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user?.isActive) {
      throw new NotFoundException("User not found");
    }

    const name = dto.name?.trim();
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Name is required");
    }

    if (email && email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });

      if (existing) {
        throw new ConflictException("Email already registered");
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(dto.phone !== undefined ? { phone: phone || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        adminProfile: { select: { accessLevel: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        role: user.role,
        action: "USER_SELF_UPDATED",
        entity: "User",
        entityId: userId,
        metadata: {
          fields: Object.keys(dto),
        },
      },
    });

    return updated;
  }

  async changeMyPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.isActive) {
      throw new NotFoundException("User not found");
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException("New password must be different");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 12),
          refreshTokenHash: null,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          role: user.role,
          action: "USER_PASSWORD_CHANGED",
          entity: "User",
          entityId: userId,
          metadata: {},
        },
      }),
    ]);

    return { ok: true };
  }

  async anonymizeMyAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyProfile: { select: { id: true } },
        freelancerProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin accounts cannot self-anonymize");
    }

    if (!user.isActive) {
      return { ok: true };
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const documentFilters: Prisma.VerificationDocumentWhereInput[] = [
      { uploadedById: user.id },
    ];

    if (user.companyProfile) {
      documentFilters.push({ companyId: user.companyProfile.id });
    }

    if (user.freelancerProfile) {
      documentFilters.push({ freelancerId: user.freelancerProfile.id });
    }

    const documents = await this.prisma.verificationDocument.findMany({
      where: {
        OR: documentFilters,
      },
      select: { id: true, storagePath: true },
    });
    const anonymizedEmail = `deleted-${user.id}@nexo.local`;
    const anonymizedName = `Conta excluída ${user.id.slice(-6)}`;
    const randomPasswordHash = await bcrypt.hash(
      randomBytes(32).toString("hex"),
      12,
    );

    await this.prisma.$transaction(async (tx) => {
      if (user.companyProfile) {
        await tx.companyProfile.update({
          where: { id: user.companyProfile.id },
          data: {
            companyName: "Empresa excluída",
            document: null,
            responsibleName: "Responsável excluído",
            phone: null,
            email: anonymizedEmail,
            logoUrl: null,
            postalCode: null,
            addressStreet: null,
            addressNumber: null,
            addressComplement: null,
            neighborhood: null,
            city: null,
            state: null,
            verificationStatus: VerificationStatus.REJECTED,
          },
        });

        await tx.companyInvitation.updateMany({
          where: { invitedById: user.id },
          data: { invitedById: null },
        });
      }

      if (user.freelancerProfile) {
        await tx.freelancerProfile.update({
          where: { id: user.freelancerProfile.id },
          data: {
            fullName: null,
            cpf: null,
            identityDocument: null,
            displayName: "Profissional excluído",
            avatarUrl: null,
            postalCode: null,
            addressStreet: null,
            addressNumber: null,
            addressComplement: null,
            neighborhood: null,
            city: null,
            state: null,
            tools: null,
            transportation: null,
            dailyRateCents: null,
            professionalSummary: null,
            experienceYears: null,
            eventTypes: null,
            certifications: null,
            portfolioUrl: null,
            travelAvailability: null,
            bankData: Prisma.JsonNull,
            verificationStatus: VerificationStatus.REJECTED,
          },
        });

        await tx.freelancerSkill.deleteMany({
          where: { freelancerId: user.freelancerProfile.id },
        });
        await tx.availability.deleteMany({
          where: { freelancerId: user.freelancerProfile.id },
        });
        await tx.companyFavoriteFreelancer.deleteMany({
          where: { freelancerId: user.freelancerProfile.id },
        });
      }

      await tx.companyMember.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      });
      await tx.companyFavoriteFreelancer.deleteMany({
        where: { createdById: user.id },
      });
      await tx.gatewayAccount.deleteMany({ where: { userId: user.id } });
      if (user.freelancerProfile) {
        await tx.gatewayAccount.deleteMany({
          where: { freelancerId: user.freelancerProfile.id },
        });
      }
      if (user.companyProfile) {
        await tx.gatewayAccount.deleteMany({
          where: { companyId: user.companyProfile.id },
        });
      }
      await tx.verificationDocument.deleteMany({
        where: { id: { in: documents.map((document) => document.id) } },
      });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: anonymizedName,
          email: anonymizedEmail,
          phone: null,
          passwordHash: randomPasswordHash,
          refreshTokenHash: null,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          isActive: false,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          role: user.role,
          action: "USER_SELF_ANONYMIZED",
          entity: "User",
          entityId: user.id,
          metadata: {
            role: user.role,
            verificationDocumentsRemoved: documents.length,
          },
        },
      });
    });

    await Promise.all(
      documents.map(async (document) => {
        try {
          await this.documentStorage.delete(document.storagePath);
        } catch {
          // The database is already anonymized; storage cleanup can be retried operationally.
        }
      }),
    );

    return { ok: true };
  }
}
