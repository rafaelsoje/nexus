import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContractStatus,
  DisputeStatus,
  PaymentStatus,
  TransactionType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PAYMENT_GATEWAY, PaymentGateway } from "./gateways/payment-gateway";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          contract: {
            include: { event: true, company: true, freelancer: true },
          },
          splits: true,
        },
      });
    }

    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);
      return this.prisma.payment.findMany({
        where: { contract: { companyId: company.id } },
        orderBy: { createdAt: "desc" },
        include: {
          contract: { include: { event: true, freelancer: true } },
          splits: true,
        },
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.payment.findMany({
      where: { contract: { freelancerId: freelancer.id } },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { include: { event: true, company: true } },
        splits: true,
      },
    });
  }

  async processPayment(userId: string, contractId: string) {
    const company = await this.findCompanyByUserId(userId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, companyId: company.id },
      include: {
        company: { include: { wallet: true } },
        event: true,
        payment: true,
        freelancer: { include: { wallet: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (contract.payment) {
      throw new BadRequestException("Contract already has a payment");
    }

    if (contract.status !== ContractStatus.PENDING_PAYMENT) {
      throw new BadRequestException("Contract is not awaiting payment");
    }

    if (
      contract.company.verificationStatus !== VerificationStatus.VERIFIED ||
      contract.freelancer.verificationStatus !== VerificationStatus.VERIFIED
    ) {
      throw new ForbiddenException("Contract participants must be verified");
    }

    const freelancerAmountCents = contract.amountCents;
    const platformFeeCents = contract.platformFeeCents;
    const grossAmountCents = freelancerAmountCents + platformFeeCents;
    const walletBalanceCents = contract.company.wallet?.balanceCents ?? 0;
    const walletAmountCents = Math.min(walletBalanceCents, grossAmountCents);
    const gatewayAmountCents = grossAmountCents - walletAmountCents;
    const gatewayPayment =
      gatewayAmountCents > 0
        ? await this.paymentGateway.charge({
            contractId: contract.id,
            companyId: contract.companyId,
            freelancerId: contract.freelancerId,
            grossAmountCents,
            freelancerAmountCents,
            platformFeeCents,
            walletAmountCents,
            gatewayAmountCents,
          })
        : {
            status: PaymentStatus.PAID,
            gatewayTransactionId: `wallet_${contract.id}`,
            paidAt: new Date(),
            splits: [
              {
                recipientType: "FREELANCER" as const,
                amountCents: freelancerAmountCents,
                gatewayRecipientId: `freelancer_${contract.freelancerId}`,
              },
              {
                recipientType: "PLATFORM" as const,
                amountCents: platformFeeCents,
                gatewayRecipientId: "platform",
              },
            ],
          };

    return this.prisma.$transaction(async (tx) => {
      if (walletAmountCents > 0 && contract.company.wallet) {
        await tx.wallet.update({
          where: { id: contract.company.wallet.id },
          data: { balanceCents: { decrement: walletAmountCents } },
        });

        await tx.transaction.create({
          data: {
            walletId: contract.company.wallet.id,
            type: TransactionType.DEBIT,
            amountCents: walletAmountCents,
            description: `Pagamento do contrato ${contract.id}`,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          contractId: contract.id,
          status: gatewayPayment.status,
          grossAmountCents,
          freelancerAmountCents,
          platformFeeCents,
          gatewayTransactionId: gatewayPayment.gatewayTransactionId,
          paidAt: gatewayPayment.paidAt,
          splits: {
            create: gatewayPayment.splits,
          },
        },
        include: { splits: true },
      });

      if (gatewayPayment.status === PaymentStatus.PAID) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: ContractStatus.CONFIRMED },
        });
      }

      await tx.notification.create({
        data: {
          userId: contract.freelancer.userId,
          type: "PAYMENT_CONFIRMED",
          title: "Pagamento confirmado",
          body: `${company.companyName} confirmou o pagamento de ${contract.event.name}.`,
        },
      });

      return payment;
    });
  }

  simulatePayment(userId: string, contractId: string) {
    return this.processPayment(userId, contractId);
  }

  async releaseToFreelancer(paymentId: string, now = new Date()) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            company: true,
            event: true,
            disputes: true,
            freelancer: { include: { wallet: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status === PaymentStatus.RELEASED_TO_FREELANCER) {
      throw new BadRequestException("Payment already released");
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Payment must be paid before release");
    }

    if (
      payment.contract.status !== ContractStatus.CONFIRMED &&
      payment.contract.status !== ContractStatus.COMPLETED
    ) {
      throw new BadRequestException("Contract is not eligible for release");
    }

    if (now < this.addBusinessDays(payment.contract.endsAt, 1)) {
      throw new BadRequestException("Payment cannot be released before deadline");
    }

    const hasBlockingDispute = payment.contract.disputes.some((dispute) =>
      dispute.status === DisputeStatus.OPEN ||
      dispute.status === DisputeStatus.UNDER_REVIEW,
    );

    if (hasBlockingDispute) {
      throw new BadRequestException("Payment cannot be released with open dispute");
    }

    const wallet = payment.contract.freelancer.wallet;

    if (!wallet) {
      throw new BadRequestException("Freelancer wallet not found");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: payment.freelancerAmountCents } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amountCents: payment.freelancerAmountCents,
          description: `Liberação do pagamento ${payment.id}`,
        },
      });

      await tx.contract.update({
        where: { id: payment.contractId },
        data: { status: ContractStatus.PAID },
      });

      const releasedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.RELEASED_TO_FREELANCER },
        include: { splits: true },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: payment.contract.freelancer.userId,
            type: "PAYMENT_RELEASED",
            title: "Repasse liberado",
            body: `O repasse de ${payment.contract.event.name} entrou na sua carteira.`,
          },
          {
            userId: payment.contract.company.userId,
            type: "PAYMENT_RELEASED",
            title: "Pagamento liberado",
            body: `O repasse de ${payment.contract.event.name} foi liberado ao profissional.`,
          },
        ],
      });

      return releasedPayment;
    });
  }

  async processDueReleases(now = new Date()) {
    const paidPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        contract: {
          status: { in: [ContractStatus.CONFIRMED, ContractStatus.COMPLETED] },
        },
      },
      include: {
        contract: {
          include: {
            disputes: true,
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    const eligiblePayments = paidPayments.filter((payment) => {
      const hasBlockingDispute = payment.contract.disputes.some((dispute) =>
        [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW].some(
          (status) => status === dispute.status,
        ),
      );

      return (
        !hasBlockingDispute &&
        now >= this.addBusinessDays(payment.contract.endsAt, 1)
      );
    });

    const released = [];

    for (const payment of eligiblePayments) {
      released.push(await this.releaseToFreelancer(payment.id, now));
    }

    return {
      checked: paidPayments.length,
      eligible: eligiblePayments.length,
      released: released.length,
      payments: released,
    };
  }

  private async findCompanyByUserId(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!company) {
      throw new ForbiddenException("Company profile is required");
    }

    return company;
  }

  private async findFreelancerByUserId(userId: string) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return freelancer;
  }

  private addBusinessDays(date: Date, days: number) {
    const result = new Date(date);
    let remainingDays = days;

    while (remainingDays > 0) {
      result.setDate(result.getDate() + 1);

      if (result.getDay() !== 0 && result.getDay() !== 6) {
        remainingDays -= 1;
      }
    }

    return result;
  }
}
