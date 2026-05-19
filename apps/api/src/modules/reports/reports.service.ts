import { ForbiddenException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.adminSummary();
    }

    if (role === UserRole.COMPANY) {
      const company = await this.prisma.companyProfile.findUnique({
        where: { userId },
      });

      if (!company) {
        throw new ForbiddenException("Company profile is required");
      }

      return this.companySummary(company.id);
    }

    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return this.freelancerSummary(freelancer.id);
  }

  private async adminSummary() {
    const [
      users,
      companies,
      freelancers,
      events,
      contracts,
      payments,
      paymentTotals,
      contractStatus,
      eventStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.companyProfile.count(),
      this.prisma.freelancerProfile.count(),
      this.prisma.event.count(),
      this.prisma.contract.count(),
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        _sum: {
          grossAmountCents: true,
          freelancerAmountCents: true,
          platformFeeCents: true,
        },
      }),
      this.prisma.contract.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.prisma.event.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    return {
      scope: "ADMIN",
      totals: {
        users,
        companies,
        freelancers,
        events,
        contracts,
        payments,
        grossAmountCents: paymentTotals._sum.grossAmountCents ?? 0,
        freelancerAmountCents: paymentTotals._sum.freelancerAmountCents ?? 0,
        platformFeeCents: paymentTotals._sum.platformFeeCents ?? 0,
      },
      contractStatus: this.mapStatusCounts(contractStatus),
      eventStatus: this.mapStatusCounts(eventStatus),
    };
  }

  private async companySummary(companyId: string) {
    const [events, contracts, payments, paymentTotals, contractStatus] =
      await Promise.all([
        this.prisma.event.count({ where: { companyId } }),
        this.prisma.contract.count({ where: { companyId } }),
        this.prisma.payment.count({
          where: { contract: { companyId } },
        }),
        this.prisma.payment.aggregate({
          where: { contract: { companyId } },
          _sum: {
            grossAmountCents: true,
            freelancerAmountCents: true,
            platformFeeCents: true,
          },
        }),
        this.prisma.contract.groupBy({
          by: ["status"],
          where: { companyId },
          _count: { status: true },
        }),
      ]);

    return {
      scope: "COMPANY",
      totals: {
        events,
        contracts,
        payments,
        grossAmountCents: paymentTotals._sum.grossAmountCents ?? 0,
        freelancerAmountCents: paymentTotals._sum.freelancerAmountCents ?? 0,
        platformFeeCents: paymentTotals._sum.platformFeeCents ?? 0,
      },
      contractStatus: this.mapStatusCounts(contractStatus),
      eventStatus: [],
    };
  }

  private async freelancerSummary(freelancerId: string) {
    const [contracts, payments, paymentTotals, contractStatus, wallet] =
      await Promise.all([
        this.prisma.contract.count({ where: { freelancerId } }),
        this.prisma.payment.count({
          where: { contract: { freelancerId } },
        }),
        this.prisma.payment.aggregate({
          where: { contract: { freelancerId } },
          _sum: {
            grossAmountCents: true,
            freelancerAmountCents: true,
            platformFeeCents: true,
          },
        }),
        this.prisma.contract.groupBy({
          by: ["status"],
          where: { freelancerId },
          _count: { status: true },
        }),
        this.prisma.wallet.findUnique({ where: { freelancerId } }),
      ]);

    return {
      scope: "FREELANCER",
      totals: {
        contracts,
        payments,
        balanceCents: wallet?.balanceCents ?? 0,
        grossAmountCents: paymentTotals._sum.grossAmountCents ?? 0,
        freelancerAmountCents: paymentTotals._sum.freelancerAmountCents ?? 0,
        platformFeeCents: paymentTotals._sum.platformFeeCents ?? 0,
      },
      contractStatus: this.mapStatusCounts(contractStatus),
      eventStatus: [],
    };
  }

  private mapStatusCounts<
    T extends { status: string; _count: { status: number } },
  >(rows: T[]) {
    return rows.map((row) => ({
      status: row.status,
      count: row._count.status,
    }));
  }
}
