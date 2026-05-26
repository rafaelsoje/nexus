import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PayoutStatus, TransactionType, UserRole } from "@prisma/client";
import {
  CompanyAccessService,
  companyFinanceRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { TopUpWalletDto } from "./dto/top-up-wallet.dto";
import { RequestPayoutDto } from "./dto/request-payout.dto";

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async findMine(userId: string, role: UserRole) {
    if (role === UserRole.COMPANY) {
      const company = await this.companyAccess.findCompanyForUser(
        userId,
        companyReadRoles,
      );

      return this.findWallet({ companyId: company.id });
    }

    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return this.findWallet({ freelancerId: freelancer.id });
  }

  async topUpCompanyWallet(userId: string, dto: TopUpWalletDto) {
    if (dto.amountCents <= 0) {
      throw new BadRequestException("Amount must be positive");
    }

    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyFinanceRoles,
    );

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          balanceCents: dto.amountCents,
        },
        update: {
          balanceCents: { increment: dto.amountCents },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amountCents: dto.amountCents,
          description:
            dto.description?.trim() || "Carga de saldo da carteira da empresa",
        },
      });

      return tx.wallet.findUnique({
        where: { id: wallet.id },
        include: {
          transactions: { orderBy: { createdAt: "desc" } },
          payouts: { orderBy: { createdAt: "desc" } },
        },
      });
    });
  }

  async requestFreelancerPayout(userId: string, dto: RequestPayoutDto) {
    if (dto.amountCents <= 0) {
      throw new BadRequestException("Amount must be positive");
    }

    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!freelancer?.wallet) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    if (freelancer.wallet.balanceCents < dto.amountCents) {
      throw new BadRequestException("Insufficient wallet balance");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: freelancer.wallet!.id },
        data: { balanceCents: { decrement: dto.amountCents } },
      });

      await tx.transaction.create({
        data: {
          walletId: freelancer.wallet!.id,
          type: TransactionType.PAYOUT,
          amountCents: dto.amountCents,
          description: dto.description?.trim() || "Solicitação de saque",
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "PAYOUT_REQUESTED",
          entity: "Wallet",
          entityId: freelancer.wallet!.id,
          metadata: {
            freelancerId: freelancer.id,
            amountCents: dto.amountCents,
          },
        },
      });

      return tx.payout.create({
        data: {
          freelancerId: freelancer.id,
          walletId: freelancer.wallet!.id,
          amountCents: dto.amountCents,
          status: PayoutStatus.SCHEDULED,
          scheduledFor: new Date(),
        },
      });
    });
  }

  private async findWallet(where: {
    companyId?: string;
    freelancerId?: string;
  }) {
    const wallet = await this.prisma.wallet.findFirst({
      where,
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        payouts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    return wallet;
  }
}
