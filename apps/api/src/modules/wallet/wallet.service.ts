import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TransactionType, UserRole } from "@prisma/client";
import {
  CompanyAccessService,
  companyFinanceRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { TopUpWalletDto } from "./dto/top-up-wallet.dto";

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
