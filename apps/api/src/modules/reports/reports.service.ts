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
    ] = await Promise.all([
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
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { contract: { companyId } },
        _count: { status: true },
      }),
      this.paymentTrend({ contract: { companyId } }),
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
    ] = await Promise.all([
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
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { contract: { freelancerId } },
        _count: { status: true },
      }),
      this.paymentTrend({ contract: { freelancerId } }),
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
      paymentStatus: this.mapStatusCounts(paymentStatus),
      paymentTrend,
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
