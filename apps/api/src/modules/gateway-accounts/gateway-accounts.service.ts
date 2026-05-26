import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GatewayAccount,
  GatewayAccountStatus,
  GatewayKycStatus,
  GatewayProvider,
  Prisma,
  VerificationStatus,
} from "@prisma/client";
import { PAYMENT_GATEWAY, PaymentGateway } from "../payments/gateways/payment-gateway";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertGatewayAccountDto } from "./dto/upsert-gateway-account.dto";

type AuditContext = {
  userId: string;
  role: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class GatewayAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async upsertFreelancerAccount(
    userId: string,
    dto: UpsertGatewayAccountDto,
    audit?: AuditContext,
  ) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!freelancer) {
      throw new NotFoundException("Freelancer profile not found");
    }

    if (freelancer.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Freelancer must be verified");
    }

    const gateway = this.currentGatewayProvider();
    const existing = await this.prisma.gatewayAccount.findUnique({
      where: {
        gateway_freelancerId: {
          gateway,
          freelancerId: freelancer.id,
        },
      },
    });

    const baseData = {
      userId,
      freelancerId: freelancer.id,
      gateway,
      documentType: dto.documentType,
      documentNumber: this.onlyDigits(dto.documentNumber),
      bankCode: dto.bankCode,
      agency: dto.agency,
      account: dto.account,
      accountDigit: dto.accountDigit,
      accountType: dto.accountType,
      pixKey: dto.pixKey,
      pixKeyType: dto.pixKeyType,
    };

    try {
      const recipientInput = {
        freelancerId: freelancer.id,
        userId,
        name: dto.holderName || freelancer.fullName || freelancer.user.name,
        document: this.onlyDigits(dto.documentNumber),
        documentType: dto.documentType,
        documentNumber: this.onlyDigits(dto.documentNumber),
        birthDate: dto.birthDate,
        email: dto.email ?? freelancer.user.email,
        phone: dto.phone ?? freelancer.user.phone,
        address: {
          postalCode: dto.postalCode,
          street: dto.addressStreet,
          number: dto.addressNumber,
          complement: dto.addressComplement,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state,
        },
        bankAccount: {
          bankCode: dto.bankCode,
          agency: dto.agency,
          account: dto.account,
          accountDigit: dto.accountDigit,
          accountType: dto.accountType,
        },
        pix: {
          key: dto.pixKey,
          keyType: dto.pixKeyType,
        },
        bankData: {
          documentType: dto.documentType,
          documentNumber: this.onlyDigits(dto.documentNumber),
          bankCode: dto.bankCode,
          agency: dto.agency,
          account: dto.account,
          accountDigit: dto.accountDigit,
          accountType: dto.accountType,
          pixKey: dto.pixKey,
          pixKeyType: dto.pixKeyType,
        },
      };
      const recipient = existing?.gatewayRecipientId
        ? await this.paymentGateway.updateRecipient({
            ...recipientInput,
            gatewayRecipientId: existing.gatewayRecipientId,
          })
        : await this.paymentGateway.createRecipient(recipientInput);

      const account = await this.prisma.gatewayAccount.upsert({
        where: {
          gateway_freelancerId: {
            gateway,
            freelancerId: freelancer.id,
          },
        },
        create: {
          ...baseData,
          gatewayRecipientId: recipient.gatewayRecipientId,
          gatewayWalletId: recipient.gatewayWalletId,
          status: this.mapAccountStatus(recipient.status),
          kycStatus: this.mapKycStatus(recipient.kycStatus),
          rawGatewayResponse: this.toJson(recipient.raw),
          errorMessage: null,
        },
        update: {
          ...baseData,
          gatewayRecipientId: recipient.gatewayRecipientId,
          gatewayWalletId: recipient.gatewayWalletId,
          status: this.mapAccountStatus(recipient.status),
          kycStatus: this.mapKycStatus(recipient.kycStatus),
          rawGatewayResponse: this.toJson(recipient.raw),
          errorMessage: null,
        },
      });

      await this.auditGatewayAccount(
        account,
        existing ? "GATEWAY_ACCOUNT_UPDATED" : "GATEWAY_ACCOUNT_CREATED",
        audit,
      );

      return this.maskGatewayAccount(account);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message.slice(0, 240)
          : "Gateway recipient creation failed";
      const account = await this.prisma.gatewayAccount.upsert({
        where: {
          gateway_freelancerId: {
            gateway,
            freelancerId: freelancer.id,
          },
        },
        create: {
          ...baseData,
          status: GatewayAccountStatus.ERROR,
          kycStatus: GatewayKycStatus.REQUIRED_MORE_INFO,
          errorMessage: message,
          rawGatewayResponse: this.toJson({ error: message }),
        },
        update: {
          ...baseData,
          status: GatewayAccountStatus.ERROR,
          kycStatus: GatewayKycStatus.REQUIRED_MORE_INFO,
          errorMessage: message,
          rawGatewayResponse: this.toJson({ error: message }),
        },
      });

      await this.auditGatewayAccount(account, "GATEWAY_ACCOUNT_ERROR", audit, {
        errorMessage: message,
      });

      return this.maskGatewayAccount(account);
    }
  }

  async findMyFreelancerAccount(userId: string) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!freelancer) {
      throw new NotFoundException("Freelancer profile not found");
    }

    const account = await this.prisma.gatewayAccount.findFirst({
      where: { freelancerId: freelancer.id },
      orderBy: { updatedAt: "desc" },
    });

    return account ? this.maskGatewayAccount(account) : null;
  }

  async listForAdmin(audit?: AuditContext) {
    const accounts = await this.prisma.gatewayAccount.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        freelancer: { select: { id: true, displayName: true } },
        company: { select: { id: true, companyName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: audit?.userId,
        role: audit?.role,
        ip: audit?.ip,
        userAgent: audit?.userAgent,
        action: "ADMIN_GATEWAY_ACCOUNTS_LISTED",
        entity: "GatewayAccount",
        metadata: { count: accounts.length },
      },
    });

    return accounts.map((account) => this.maskGatewayAccount(account));
  }

  async findForAdmin(id: string, audit?: AuditContext) {
    const account = await this.prisma.gatewayAccount.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        freelancer: { select: { id: true, displayName: true } },
        company: { select: { id: true, companyName: true } },
      },
    });

    if (!account) {
      throw new NotFoundException("Gateway account not found");
    }

    await this.auditGatewayAccount(account, "ADMIN_GATEWAY_ACCOUNT_VIEWED", audit);

    return this.maskGatewayAccount(account);
  }

  async recheckForAdmin(id: string, audit?: AuditContext) {
    const account = await this.prisma.gatewayAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException("Gateway account not found");
    }

    if (!account.gatewayRecipientId) {
      throw new BadRequestException("Gateway recipient id is missing");
    }

    const status = await this.paymentGateway.getRecipientStatus(
      account.gatewayRecipientId,
    );
    const updated = await this.prisma.gatewayAccount.update({
      where: { id },
      data: {
        status: this.mapAccountStatus(status.status),
        kycStatus: this.mapKycStatus(status.kycStatus),
        rawGatewayResponse: this.toJson(status.raw),
        errorMessage: null,
      },
    });

    await this.auditGatewayAccount(
      updated,
      "ADMIN_GATEWAY_ACCOUNT_STATUS_RECHECKED",
      audit,
    );

    return this.maskGatewayAccount(updated);
  }

  maskGatewayAccount<T extends GatewayAccount>(account: T) {
    return {
      ...account,
      documentNumber: maskDocument(account.documentNumber),
      agency: maskGeneric(account.agency),
      account: maskBankAccount(account.account, account.accountDigit),
      accountDigit: account.accountDigit ? "*" : null,
      pixKey: maskPix(account.pixKey),
      rawGatewayResponse: undefined,
    };
  }

  private currentGatewayProvider() {
    const configured = (
      this.config.get<string>("PAYMENT_GATEWAY_PROVIDER") ??
      this.config.get<string>("PAYMENT_GATEWAY") ??
      "simulated"
    ).toUpperCase();

    if (!(configured in GatewayProvider)) {
      throw new BadRequestException(`Unknown gateway provider "${configured}"`);
    }

    return GatewayProvider[configured as keyof typeof GatewayProvider];
  }

  private mapAccountStatus(status?: string | GatewayAccountStatus) {
    if (!status) {
      return GatewayAccountStatus.PENDING;
    }

    const normalized = String(status).toUpperCase();
    if (normalized === "APPROVED") {
      return GatewayAccountStatus.ACTIVE;
    }

    if (normalized in GatewayAccountStatus) {
      return GatewayAccountStatus[
        normalized as keyof typeof GatewayAccountStatus
      ];
    }

    return GatewayAccountStatus.PENDING;
  }

  private mapKycStatus(status?: string | GatewayKycStatus) {
    if (!status) {
      return GatewayKycStatus.PENDING;
    }

    const normalized = String(status).toUpperCase();
    if (normalized === "VERIFIED") {
      return GatewayKycStatus.APPROVED;
    }

    if (normalized in GatewayKycStatus) {
      return GatewayKycStatus[normalized as keyof typeof GatewayKycStatus];
    }

    return GatewayKycStatus.PENDING;
  }

  private async auditGatewayAccount(
    account: Pick<GatewayAccount, "id" | "freelancerId" | "companyId" | "status" | "kycStatus">,
    action: string,
    audit?: AuditContext,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: audit?.userId,
        role: audit?.role,
        ip: audit?.ip,
        userAgent: audit?.userAgent,
        action,
        entity: "GatewayAccount",
        entityId: account.id,
        metadata: {
          freelancerId: account.freelancerId,
          companyId: account.companyId,
          status: account.status,
          kycStatus: account.kycStatus,
          ...metadata,
        },
      },
    });
  }

  private onlyDigits(value?: string | null) {
    return value?.replace(/\D/g, "") ?? null;
  }

  private toJson(value?: Record<string, unknown>) {
    return (value ?? {}) as Prisma.InputJsonValue;
  }
}

export function maskDocument(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  if (digits.length === 14) {
    return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
  }

  return value ? maskGeneric(value) : null;
}

export function maskBankAccount(account?: string | null, digit?: string | null) {
  if (!account) {
    return null;
  }

  const visible = account.slice(-1);
  const masked = `${"*".repeat(Math.max(account.length - 1, 1))}${visible}`;
  return digit ? `${masked}-${digit}` : masked;
}

export function maskPix(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  if (value.length <= 6) {
    return maskGeneric(value);
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function maskGeneric(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.length <= 2) {
    return "*".repeat(value.length);
  }

  return `${value[0]}${"*".repeat(value.length - 2)}${value.at(-1)}`;
}
