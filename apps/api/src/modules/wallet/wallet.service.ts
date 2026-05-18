import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string, role: UserRole) {
    if (role === UserRole.COMPANY) {
      const company = await this.prisma.companyProfile.findUnique({
        where: { userId },
      });

      if (!company) {
        throw new ForbiddenException("Company profile is required");
      }

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
