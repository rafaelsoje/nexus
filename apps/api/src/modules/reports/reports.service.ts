import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import {
  CompanyAccessService,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async summary(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.adminSummary();
    }

    if (role === UserRole.COMPANY) {
      const company = await this.companyAccess.findCompanyForUser(
        userId,
        companyReadRoles,
      );

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
      paymentStatus,
      paymentTrend,
      financialSummary,
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
      this.prisma.payment.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.paymentTrend(),
      this.financialSummary(),
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
      paymentStatus: this.mapStatusCounts(paymentStatus),
      paymentTrend,
      financialSummary,
    };
  }

  private async companySummary(companyId: string) {
    const [
      events,
      contracts,
      payments,
      paymentTotals,
      contractStatus,
      paymentStatus,
      paymentTrend,
      financialSummary,
    ] = await Promise.all([
      this.prisma.event.count({ where: { companyId } }),
      this.prisma.contract.count({ where: { companyId } }),
      this.prisma.payment.count({
        where: { companyId },
      }),
      this.prisma.payment.aggregate({
        where: { companyId },
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
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { status: true },
      }),
      this.paymentTrend({ companyId }),
      this.financialSummary(
        { companyId },
        { payment: { companyId } },
        { paymentSplit: { payment: { companyId } } },
        { companyId },
      ),
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
      paymentStatus: this.mapStatusCounts(paymentStatus),
      paymentTrend,
      financialSummary,
    };
  }

  private async freelancerSummary(freelancerId: string) {
    const [
      contracts,
      payments,
      paymentTotals,
      contractStatus,
      paymentStatus,
      paymentTrend,
      wallet,
      financialSummary,
    ] = await Promise.all([
      this.prisma.contract.count({ where: { freelancerId } }),
      this.prisma.payment.count({
        where: { splits: { some: { freelancerId } } },
      }),
      this.prisma.payment.aggregate({
        where: { splits: { some: { freelancerId } } },
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
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { splits: { some: { freelancerId } } },
        _count: { status: true },
      }),
      this.paymentTrend({ splits: { some: { freelancerId } } }),
      this.prisma.wallet.findUnique({ where: { freelancerId } }),
      this.financialSummary(
        { splits: { some: { freelancerId } } },
        { freelancerId },
        { freelancerId },
        { freelancerId },
      ),
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
      paymentStatus: this.mapStatusCounts(paymentStatus),
      paymentTrend,
      financialSummary,
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

  private async paymentTrend(where?: Prisma.PaymentWhereInput) {
    const months = this.lastMonths(6);
    const firstMonth = months[0]?.start;
    const buckets = new Map(
      months.map((month) => [
        month.key,
        {
          month: month.key,
          label: month.label,
          grossAmountCents: 0,
          freelancerAmountCents: 0,
          platformFeeCents: 0,
          payments: 0,
        },
      ]),
    );

    const payments = await this.prisma.payment.findMany({
      where: {
        ...where,
        OR: [
          { paidAt: { gte: firstMonth } },
          { paidAt: null, createdAt: { gte: firstMonth } },
        ],
      },
      select: {
        createdAt: true,
        freelancerAmountCents: true,
        grossAmountCents: true,
        paidAt: true,
        platformFeeCents: true,
      },
    });

    for (const payment of payments) {
      const date = payment.paidAt ?? payment.createdAt;
      const bucket = buckets.get(this.monthKey(date));

      if (!bucket) {
        continue;
      }

      bucket.grossAmountCents += payment.grossAmountCents;
      bucket.freelancerAmountCents += payment.freelancerAmountCents;
      bucket.platformFeeCents += payment.platformFeeCents;
      bucket.payments += 1;
    }

    return Array.from(buckets.values());
  }

  private async financialSummary(
    paymentWhere: Prisma.PaymentWhereInput = {},
    splitWhere: Prisma.PaymentSplitWhereInput = {},
    payoutWhere: Prisma.PayoutWhereInput = {},
    walletWhere: Prisma.WalletWhereInput = {},
  ) {
    const [
      payments,
      splits,
      splitStatus,
      payouts,
      payoutStatus,
      wallets,
      chargebacks,
      refunds,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: paymentWhere,
        _sum: {
          amountToChargeCompanyCents: true,
          grossAmountCents: true,
          walletAmountCents: true,
          gatewayAmountCents: true,
          companyFeeAmountCents: true,
          freelancerFeeAmountCents: true,
          platformAmountCents: true,
          gatewayFeeAmountCents: true,
        },
      }),
      this.prisma.paymentSplit.aggregate({
        where: splitWhere,
        _sum: {
          grossAmountCents: true,
          freelancerNetAmountCents: true,
          platformFeeAmountCents: true,
          gatewayFeeAmountCents: true,
        },
      }),
      this.prisma.paymentSplit.groupBy({
        by: ["releaseStatus"],
        where: splitWhere,
        _count: { releaseStatus: true },
        _sum: {
          freelancerNetAmountCents: true,
          grossAmountCents: true,
          platformFeeAmountCents: true,
        },
      }),
      this.prisma.payout.aggregate({
        where: payoutWhere,
        _sum: { amountCents: true },
      }),
      this.prisma.payout.groupBy({
        by: ["status"],
        where: payoutWhere,
        _count: { status: true },
        _sum: { amountCents: true },
      }),
      this.prisma.wallet.aggregate({
        where: walletWhere,
        _sum: { balanceCents: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, status: "CHARGEBACK" },
        _sum: { amountToChargeCompanyCents: true, grossAmountCents: true },
        _count: { id: true },
      }),
      this.prisma.paymentSplit.aggregate({
        where: { ...splitWhere, releaseStatus: "REFUNDED" },
        _sum: { grossAmountCents: true, freelancerNetAmountCents: true },
        _count: { id: true },
      }),
    ]);

    return {
      gmvCents:
        payments._sum.amountToChargeCompanyCents ??
        payments._sum.grossAmountCents ??
        0,
      walletPaidCents: payments._sum.walletAmountCents ?? 0,
      gatewayPaidCents: payments._sum.gatewayAmountCents ?? 0,
      companyFeeCents: payments._sum.companyFeeAmountCents ?? 0,
      freelancerFeeCents: payments._sum.freelancerFeeAmountCents ?? 0,
      platformFeeCents: payments._sum.platformAmountCents ?? 0,
      gatewayFeeCents:
        (payments._sum.gatewayFeeAmountCents ?? 0) +
        (splits._sum.gatewayFeeAmountCents ?? 0),
      splitGrossCents: splits._sum.grossAmountCents ?? 0,
      freelancerNetCents: splits._sum.freelancerNetAmountCents ?? 0,
      splitPlatformFeeCents: splits._sum.platformFeeAmountCents ?? 0,
      walletBalanceCents: wallets._sum.balanceCents ?? 0,
      payoutAmountCents: payouts._sum.amountCents ?? 0,
      chargebackAmountCents:
        chargebacks._sum.amountToChargeCompanyCents ??
        chargebacks._sum.grossAmountCents ??
        0,
      chargebacks: chargebacks._count.id,
      refundedGrossCents: refunds._sum.grossAmountCents ?? 0,
      refundedFreelancerNetCents: refunds._sum.freelancerNetAmountCents ?? 0,
      refunds: refunds._count.id,
      splitStatus: splitStatus.map((row) => ({
        status: row.releaseStatus,
        count: row._count.releaseStatus,
        grossAmountCents: row._sum.grossAmountCents ?? 0,
        freelancerNetAmountCents: row._sum.freelancerNetAmountCents ?? 0,
        platformFeeAmountCents: row._sum.platformFeeAmountCents ?? 0,
      })),
      payoutStatus: payoutStatus.map((row) => ({
        status: row.status,
        count: row._count.status,
        amountCents: row._sum.amountCents ?? 0,
      })),
    };
  }

  private lastMonths(count: number) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    return Array.from({ length: count }, (_, index) => {
      const start = new Date(currentMonth);
      start.setMonth(currentMonth.getMonth() - (count - index - 1));

      return {
        key: this.monthKey(start),
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
          start,
        ),
        start,
      };
    });
  }

  private monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}
