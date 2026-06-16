import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdminAccessLevel,
  ContractStatus,
  DisputeStatus,
  PaymentSplitStatus,
  PayoutStatus,
  PaymentStatus,
  TransactionType,
  Prisma,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { CompanyAccessService } from "../company-access/company-access.service";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { DisputeFinancialResolution } from "./dto/resolve-dispute-financial.dto";

type AuditLogFilters = {
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditContext = {
  userId: string;
  role: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly paymentsService: PaymentsService,
  ) {}

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: this.adminUserSelect(),
    });
  }

  async createAdminUser(dto: CreateAdminUserDto, audit: AuditContext) {
    await this.assertCanManageAdmins(audit.userId);
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const password = dto.password ?? this.generateTemporaryPassword();
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: normalizedEmail,
          phone: dto.phone,
          role: UserRole.ADMIN,
          passwordHash: await bcrypt.hash(password, 12),
          adminProfile: {
            create: {
              accessLevel: dto.accessLevel,
              createdById: audit.userId,
            },
          },
        },
        select: this.adminUserSelect(),
      });

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "ADMIN_USER_CREATED",
          entity: "User",
          entityId: user.id,
          metadata: {
            targetUserRole: UserRole.ADMIN,
            accessLevel: dto.accessLevel,
          },
        },
      });

      return user;
    });

    return dto.password ? created : { ...created, temporaryPassword: password };
  }

  async updateAdminAccess(
    id: string,
    accessLevel: AdminAccessLevel,
    audit: AuditContext,
  ) {
    await this.assertCanManageAdmins(audit.userId);
    await this.assertNotLastOwner(id, accessLevel);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          adminProfile: {
            upsert: {
              create: { accessLevel, createdById: audit.userId },
              update: { accessLevel },
            },
          },
        },
        select: this.adminUserSelect(),
      });

      if (updated.role !== UserRole.ADMIN) {
        throw new BadRequestException(
          "Only admin users can receive admin access",
        );
      }

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "ADMIN_ACCESS_UPDATED",
          entity: "User",
          entityId: id,
          metadata: { accessLevel },
        },
      });

      return updated;
    });
  }

  async updateUserStatus(id: string, isActive: boolean, audit: AuditContext) {
    await this.assertCanUpdateUserStatus(id, audit.userId, isActive);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          isActive,
          refreshTokenHash: isActive ? undefined : null,
        },
        select: this.adminUserSelect(),
      });

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "USER_STATUS_UPDATED",
          entity: "User",
          entityId: id,
          metadata: {
            targetUserRole: updated.role,
            isActive,
          },
        },
      });

      return updated;
    });
  }

  listCompanies() {
    return this.prisma.companyProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        wallet: true,
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  listFreelancers() {
    return this.prisma.freelancerProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        wallet: true,
        skills: { include: { skill: true } },
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  listEvents() {
    return this.prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        company: true,
        requirements: { include: { skill: true } },
        invitations: true,
        contracts: true,
      },
    });
  }

  listAuditLogs(filters: AuditLogFilters = {}) {
    const createdAt =
      filters.dateFrom || filters.dateTo
        ? {
            gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            lte: filters.dateTo ? this.endOfDay(filters.dateTo) : undefined,
          }
        : undefined;

    return this.prisma.auditLog.findMany({
      where: {
        action: filters.action
          ? { contains: filters.action, mode: "insensitive" }
          : undefined,
        entity: filters.entity
          ? { contains: filters.entity, mode: "insensitive" }
          : undefined,
        userId: filters.userId || undefined,
        createdAt,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: true,
        event: true,
        splits: {
          include: {
            contract: {
              include: { event: true, company: true, freelancer: true },
            },
            freelancer: true,
          },
        },
      },
    });
  }

  async findPaymentDetail(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        company: { include: { wallet: true, user: true } },
        event: true,
        splits: {
          include: {
            contract: {
              include: {
                event: true,
                company: true,
                freelancer: true,
                disputes: { orderBy: { createdAt: "desc" } },
              },
            },
            freelancer: {
              include: {
                user: true,
                wallet: true,
                gatewayAccounts: true,
              },
            },
            payout: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const gatewayIds = [
      payment.gatewayPaymentId,
      payment.gatewayTransactionId,
    ].filter(Boolean) as string[];

    const webhooks = gatewayIds.length
      ? await this.prisma.paymentWebhookEvent.findMany({
          where: {
            OR: gatewayIds.flatMap((gatewayId) => [
              { gatewayEventId: { contains: gatewayId } },
              {
                payload: {
                  path: ["transactionId"],
                  equals: gatewayId,
                },
              },
            ]),
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const splitIds = payment.splits.map((split) => split.id);
    const contractIds = payment.splits.map((split) => split.contractId);
    const webhookIds = webhooks.map((webhook) => webhook.id);

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entity: "Payment", entityId: payment.id },
          { entity: "PaymentSplit", entityId: { in: splitIds } },
          { entity: "Contract", entityId: { in: contractIds } },
          { entity: "PaymentWebhookEvent", entityId: { in: webhookIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      take: 100,
    });

    return {
      ...payment,
      webhooks,
      auditLogs,
    };
  }

  listPaymentWebhooks() {
    return this.prisma.paymentWebhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  reprocessPaymentWebhook(id: string) {
    return this.paymentsService.reprocessWebhookEvent(id);
  }

  listPayouts() {
    return this.prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        freelancer: true,
        wallet: true,
        paymentSplit: {
          include: {
            contract: { include: { event: true } },
          },
        },
      },
    });
  }

  listDisputes() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          include: {
            event: true,
            company: true,
            freelancer: true,
            paymentSplits: {
              include: {
                payment: true,
                freelancer: true,
                payout: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
  }

  updateCompanyVerification(
    id: string,
    status: VerificationStatus,
    message: string | undefined,
    audit: AuditContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rejectionMessage = this.prepareVerificationMessage(status, message);
      await this.assertVerificationRequirements(tx, "company", id, status);
      const updated = await tx.companyProfile.update({
        where: { id },
        data: { verificationStatus: status },
        include: { user: { select: { id: true } } },
      });

      if (status === VerificationStatus.REJECTED) {
        await tx.notification.create({
          data: {
            userId: updated.user.id,
            type: "VERIFICATION_REJECTED",
            title: "Documentos da empresa precisam de correção",
            body: rejectionMessage,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "COMPANY_VERIFICATION_UPDATED",
          entity: "CompanyProfile",
          entityId: id,
          metadata: { message: rejectionMessage, status },
        },
      });

      return updated;
    });
  }

  updateFreelancerVerification(
    id: string,
    status: VerificationStatus,
    message: string | undefined,
    audit: AuditContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rejectionMessage = this.prepareVerificationMessage(status, message);
      await this.assertVerificationRequirements(tx, "freelancer", id, status);
      const updated = await tx.freelancerProfile.update({
        where: { id },
        data: { verificationStatus: status },
        include: { user: { select: { id: true } } },
      });

      if (status === VerificationStatus.REJECTED) {
        await tx.notification.create({
          data: {
            userId: updated.user.id,
            type: "VERIFICATION_REJECTED",
            title: "Documentos profissionais precisam de correção",
            body: rejectionMessage,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "FREELANCER_VERIFICATION_UPDATED",
          entity: "FreelancerProfile",
          entityId: id,
          metadata: { message: rejectionMessage, status },
        },
      });

      return updated;
    });
  }

  private prepareVerificationMessage(
    status: VerificationStatus,
    message: string | undefined,
  ) {
    const trimmedMessage = message?.trim();

    if (status !== VerificationStatus.REJECTED) {
      return trimmedMessage || undefined;
    }

    if (!trimmedMessage) {
      throw new BadRequestException(
        "Verification rejection message is required",
      );
    }

    return trimmedMessage;
  }

  private async assertVerificationRequirements(
    tx: Prisma.TransactionClient,
    profileType: "company" | "freelancer",
    profileId: string,
    status: VerificationStatus,
  ) {
    if (status !== VerificationStatus.VERIFIED) {
      return;
    }

    const document = await tx.verificationDocument.findFirst({
      where:
        profileType === "company"
          ? { companyId: profileId }
          : { freelancerId: profileId },
      select: { id: true },
    });

    if (!document) {
      throw new BadRequestException("Verification documents are required");
    }

    if (profileType === "company") {
      const company = await tx.companyProfile.findUnique({
        where: { id: profileId },
        select: {
          companyName: true,
          document: true,
          responsibleName: true,
          phone: true,
          email: true,
          city: true,
          state: true,
        },
      });

      if (
        !company ||
        !this.hasRequiredText(company.companyName) ||
        !this.hasRequiredText(company.document) ||
        !this.hasRequiredText(company.responsibleName) ||
        !this.hasRequiredText(company.phone) ||
        !this.hasRequiredText(company.email) ||
        !this.hasRequiredText(company.city) ||
        !this.hasRequiredText(company.state)
      ) {
        throw new BadRequestException(
          "Company profile must be completed before verification",
        );
      }

      return;
    }

    const freelancer = await tx.freelancerProfile.findUnique({
      where: { id: profileId },
      select: {
        fullName: true,
        cpf: true,
        displayName: true,
        city: true,
        state: true,
        transportation: true,
        skills: { select: { skillId: true } },
      },
    });

    if (
      !freelancer ||
      !this.hasRequiredText(freelancer.fullName) ||
      !this.hasRequiredText(freelancer.cpf) ||
      !this.hasRequiredText(freelancer.displayName) ||
      !this.hasRequiredText(freelancer.city) ||
      !this.hasRequiredText(freelancer.state) ||
      !this.hasRequiredText(freelancer.transportation) ||
      freelancer.skills.length === 0
    ) {
      throw new BadRequestException(
        "Freelancer profile and skills must be completed before verification",
      );
    }
  }

  private hasRequiredText(value?: string | null) {
    return Boolean(value?.trim());
  }

  updateDisputeStatus(id: string, status: DisputeStatus, audit?: AuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id },
        data: { status },
        include: {
          contract: {
            include: {
              event: true,
              company: true,
              freelancer: true,
              paymentSplits: { include: { payment: true } },
            },
          },
        },
      });

      if (
        dispute.contract.status === ContractStatus.DISPUTED &&
        (status === DisputeStatus.RESOLVED || status === DisputeStatus.REJECTED)
      ) {
        await tx.contract.update({
          where: { id: dispute.contractId },
          data: {
            status: dispute.contract.paymentSplits.some(
              (split) => split.payment.status === PaymentStatus.PAID,
            )
              ? ContractStatus.CONFIRMED
              : ContractStatus.PENDING_PAYMENT,
          },
        });
      }

      const notification = {
        type: "DISPUTE_STATUS_UPDATED",
        title: "Disputa atualizada",
        body: `${dispute.contract.event.name}: status alterado para ${status}.`,
      };

      await this.companyAccess.notifyCompanyMembers(
        tx,
        dispute.contract.companyId,
        notification,
      );
      await tx.notification.createMany({
        data: [
          {
            userId: dispute.contract.freelancer.userId,
            ...notification,
          },
        ],
      });

      if (audit) {
        await tx.auditLog.create({
          data: {
            userId: audit.userId,
            role: audit.role,
            ip: audit.ip,
            userAgent: audit.userAgent,
            action: "DISPUTE_STATUS_UPDATED",
            entity: "Dispute",
            entityId: id,
            metadata: { status },
          },
        });
      }

      return dispute;
    });
  }

  async resolveDisputeFinancial(
    id: string,
    resolution: DisputeFinancialResolution,
    audit?: AuditContext,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            event: true,
            company: true,
            freelancer: true,
            paymentSplits: {
              where: {
                releaseStatus: {
                  in: [
                    PaymentSplitStatus.BLOCKED,
                    PaymentSplitStatus.WAITING_RELEASE,
                    PaymentSplitStatus.RESERVED,
                  ],
                },
              },
              include: { payment: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    if (!dispute.contract.paymentSplits.length) {
      throw new BadRequestException("Dispute has no pending payment split");
    }

    if (resolution === DisputeFinancialResolution.REFUND_COMPANY) {
      const updatedDispute = await this.updateDisputeStatus(
        id,
        DisputeStatus.RESOLVED,
        audit,
      );
      const splits = [];

      for (const split of dispute.contract.paymentSplits) {
        splits.push(await this.paymentsService.refundSplit(split.id));
      }

      await this.createDisputeResolutionAudit(
        id,
        resolution,
        splits.length,
        audit,
      );

      return { dispute: updatedDispute, splits };
    }

    const targetStatus =
      resolution === DisputeFinancialResolution.RELEASE_FREELANCER
        ? DisputeStatus.REJECTED
        : DisputeStatus.REJECTED;
    await this.updateDisputeStatus(id, targetStatus, audit);

    const unblocked = [];
    const released = [];

    for (const split of dispute.contract.paymentSplits) {
      const current =
        split.releaseStatus === PaymentSplitStatus.BLOCKED
          ? await this.paymentsService.unblockSplit(split.id)
          : split;
      unblocked.push(current);

      if (resolution === DisputeFinancialResolution.RELEASE_FREELANCER) {
        released.push(await this.paymentsService.releaseSplit(split.id));
      }
    }

    await this.createDisputeResolutionAudit(
      id,
      resolution,
      resolution === DisputeFinancialResolution.RELEASE_FREELANCER
        ? released.length
        : unblocked.length,
      audit,
    );

    return {
      dispute: await this.prisma.dispute.findUnique({
        where: { id },
        include: {
          contract: {
            include: {
              event: true,
              company: true,
              freelancer: true,
              paymentSplits: { include: { payment: true, freelancer: true } },
            },
          },
        },
      }),
      splits:
        resolution === DisputeFinancialResolution.RELEASE_FREELANCER
          ? released
          : unblocked,
    };
  }

  private async createDisputeResolutionAudit(
    disputeId: string,
    resolution: DisputeFinancialResolution,
    affectedSplits: number,
    audit?: AuditContext,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: audit?.userId,
        role: audit?.role,
        ip: audit?.ip,
        userAgent: audit?.userAgent,
        action: "DISPUTE_FINANCIAL_RESOLUTION_APPLIED",
        entity: "Dispute",
        entityId: disputeId,
        metadata: {
          resolution,
          affectedSplits,
        },
      },
    });
  }

  private endOfDay(date: string) {
    const parsed = new Date(date);
    parsed.setHours(23, 59, 59, 999);
    return parsed;
  }

  private adminUserSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      adminProfile: { select: { accessLevel: true } },
    } as const;
  }

  private generateTemporaryPassword() {
    return `Nexo@${randomBytes(4).toString("hex")}`;
  }

  private async assertCanManageAdmins(userId: string) {
    const requester = await this.prisma.adminProfile.findUnique({
      where: { userId },
      select: { accessLevel: true },
    });

    if (
      !requester ||
      (requester.accessLevel !== AdminAccessLevel.OWNER &&
        requester.accessLevel !== AdminAccessLevel.MANAGER)
    ) {
      throw new ForbiddenException("Admin access is required");
    }
  }

  private async assertCanUpdateUserStatus(
    targetUserId: string,
    requesterUserId: string,
    isActive: boolean,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        role: true,
        adminProfile: { select: { accessLevel: true } },
      },
    });

    if (!target) {
      throw new NotFoundException("User not found");
    }

    if (target.role !== UserRole.ADMIN) {
      return;
    }

    await this.assertCanManageAdmins(requesterUserId);

    if (targetUserId === requesterUserId && !isActive) {
      throw new BadRequestException(
        "You cannot deactivate your own admin user",
      );
    }

    if (
      !isActive &&
      target.adminProfile?.accessLevel === AdminAccessLevel.OWNER
    ) {
      await this.assertAtLeastOneOtherActiveOwner(targetUserId);
    }
  }

  private async assertNotLastOwner(
    targetUserId: string,
    nextAccessLevel: AdminAccessLevel,
  ) {
    const current = await this.prisma.adminProfile.findUnique({
      where: { userId: targetUserId },
      select: { accessLevel: true },
    });

    if (
      current?.accessLevel === AdminAccessLevel.OWNER &&
      nextAccessLevel !== AdminAccessLevel.OWNER
    ) {
      await this.assertAtLeastOneOtherActiveOwner(targetUserId);
    }
  }

  private async assertAtLeastOneOtherActiveOwner(targetUserId: string) {
    const otherOwner = await this.prisma.adminProfile.findFirst({
      where: {
        userId: { not: targetUserId },
        accessLevel: AdminAccessLevel.OWNER,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (!otherOwner) {
      throw new BadRequestException(
        "At least one active owner admin is required",
      );
    }
  }

  updatePayoutStatus(id: string, status: PayoutStatus, audit: AuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id },
        include: { wallet: true, freelancer: true },
      });

      if (!payout) {
        throw new NotFoundException("Payout not found");
      }

      const shouldRefund =
        (status === PayoutStatus.FAILED || status === PayoutStatus.CANCELLED) &&
        payout.walletId &&
        payout.status !== PayoutStatus.FAILED &&
        payout.status !== PayoutStatus.CANCELLED;

      if (shouldRefund) {
        await tx.wallet.update({
          where: { id: payout.walletId! },
          data: { balanceCents: { increment: payout.amountCents } },
        });

        await tx.transaction.create({
          data: {
            walletId: payout.walletId!,
            type: TransactionType.REFUND,
            amountCents: payout.amountCents,
            description: `Devolução do saque ${payout.id}`,
          },
        });
      }

      const updated = await tx.payout.update({
        where: { id },
        data: {
          status,
          paidAt: status === PayoutStatus.PAID ? new Date() : undefined,
          gatewayPayoutId:
            status === PayoutStatus.PAID
              ? `sim_payout_${Date.now()}`
              : undefined,
        },
        include: { freelancer: true, wallet: true },
      });

      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          role: audit.role,
          ip: audit.ip,
          userAgent: audit.userAgent,
          action: "PAYOUT_STATUS_UPDATED",
          entity: "Payout",
          entityId: id,
          metadata: {
            status,
            refunded: shouldRefund,
            amountCents: payout.amountCents,
            freelancerId: payout.freelancerId,
          },
        },
      });

      return updated;
    });
  }
}
