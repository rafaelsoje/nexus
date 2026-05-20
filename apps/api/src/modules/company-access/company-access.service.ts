import { ForbiddenException, Injectable } from "@nestjs/common";
import { CompanyMemberRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const companyManageRoles = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
] as const;

export const companyOperateRoles = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
  CompanyMemberRole.OPERATOR,
] as const;

export const companyFinanceRoles = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
  CompanyMemberRole.FINANCE,
] as const;

export const companyReadRoles = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
  CompanyMemberRole.FINANCE,
  CompanyMemberRole.OPERATOR,
  CompanyMemberRole.VIEWER,
] as const;

@Injectable()
export class CompanyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(
    userId: string,
    allowedRoles: readonly CompanyMemberRole[] = companyReadRoles,
  ) {
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        isActive: true,
        role: { in: [...allowedRoles] },
        user: { isActive: true },
      },
      include: { company: true },
    });

    if (!membership) {
      throw new ForbiddenException("Company access is required");
    }

    return membership;
  }

  async findCompanyForUser(
    userId: string,
    allowedRoles: readonly CompanyMemberRole[] = companyReadRoles,
  ) {
    const membership = await this.findMembership(userId, allowedRoles);
    return membership.company;
  }

  async notifyCompanyMembers(
    db: Prisma.TransactionClient | PrismaService,
    companyId: string,
    notification: { type: string; title: string; body?: string },
    roles: readonly CompanyMemberRole[] = companyReadRoles,
  ) {
    const members = await db.companyMember.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: [...roles] },
        user: { isActive: true },
      },
      select: { userId: true },
    });

    if (!members.length) {
      return;
    }

    await db.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        ...notification,
      })),
    });
  }
}
