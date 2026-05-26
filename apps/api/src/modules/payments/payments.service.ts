import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ContractStatus,
  DisputeStatus,
  GatewayAccountStatus,
  GatewayKycStatus,
  GatewayProvider,
  PaymentSplitStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  TransactionType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import {
  publicCompanySelect,
  publicFreelancerSelect,
} from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyFinanceRoles,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { calculateMarketplaceFees, MarketplaceFeeBreakdown } from "./fees";
import { PAYMENT_GATEWAY, PaymentGateway } from "./gateways/payment-gateway";

type PayableContract = Prisma.ContractGetPayload<{
  include: {
    company: { include: { wallet: true } };
    event: true;
    freelancer: {
      include: {
        user: true;
        wallet: true;
        gatewayAccounts: true;
      };
    };
    paymentSplits: true;
  };
}>;

type SplitPlan = {
  contract: PayableContract;
  fees: MarketplaceFeeBreakdown;
  gatewayRecipientId: string;
  gatewayWalletId?: string | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly companyAccess: CompanyAccessService,
    private readonly config: ConfigService,
  ) {}

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: this.paymentInclude(),
      });
    }

    if (role === UserRole.COMPANY) {
      const company = await this.companyAccess.findCompanyForUser(
        userId,
        companyReadRoles,
      );
      return this.prisma.payment.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        include: this.paymentInclude(),
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.payment.findMany({
      where: { splits: { some: { freelancerId: freelancer.id } } },
      orderBy: { createdAt: "desc" },
      include: this.paymentInclude(freelancer.id),
    });
  }

  findSimulatedCheckout(gatewayPaymentId: string) {
    return this.prisma.payment.findFirst({
      where: {
        gatewayPaymentId,
        gateway: "simulated",
      },
      include: this.paymentInclude(),
    });
  }

  async processPayment(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { eventId: true },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return this.processEventPayment(userId, contract.eventId);
  }

  async processEventPayment(userId: string, eventId: string) {
    const company = await this.companyAccess.findCompanyForUser(
      userId,
      companyFinanceRoles,
    );
    const contracts = await this.prisma.contract.findMany({
      where: {
        eventId,
        companyId: company.id,
        status: ContractStatus.PENDING_PAYMENT,
        OR: [
          { paymentSplits: { none: {} } },
          {
            paymentSplits: {
              every: {
                releaseStatus: {
                  in: [
                    PaymentSplitStatus.FAILED,
                    PaymentSplitStatus.REFUNDED,
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        company: { include: { wallet: true } },
        event: true,
        freelancer: {
          include: {
            user: true,
            wallet: true,
            gatewayAccounts: true,
          },
        },
        paymentSplits: true,
      },
    });

    if (!contracts.length) {
      throw new BadRequestException("No payable contracts found for event");
    }

    const [firstContract] = contracts;
    this.assertCompanyVerified(firstContract.company);

    const splitPlans = await Promise.all(
      contracts.map(async (contract) => {
        this.assertPayableContract(contract);
        const gatewayAccount = await this.ensureFreelancerGatewayAccount(
          contract.freelancer,
        );
        return {
          contract,
          fees: calculateMarketplaceFees(contract.amountCents, this.config, {
            companyFeeAmountCents: contract.platformFeeCents,
          }),
          gatewayRecipientId: this.requireGatewayRecipientId(gatewayAccount),
          gatewayWalletId: gatewayAccount.gatewayWalletId,
        };
      }),
    );

    const totals = this.calculatePaymentTotals(splitPlans);
    const walletBalanceCents = firstContract.company.wallet?.balanceCents ?? 0;
    const walletAmountCents = Math.min(
      walletBalanceCents,
      totals.amountToChargeCompanyCents,
    );
    const gatewayAmountCents =
      totals.amountToChargeCompanyCents - walletAmountCents;
    const gatewayPayment =
      gatewayAmountCents > 0
        ? await this.paymentGateway.createMarketplacePayment({
            eventId,
            companyId: company.id,
            ...totals,
            walletAmountCents,
            gatewayAmountCents,
            splits: splitPlans.map((plan) => ({
              contractId: plan.contract.id,
              freelancerId: plan.contract.freelancerId,
              gatewayRecipientId: plan.gatewayRecipientId,
              gatewayWalletId: plan.gatewayWalletId,
              grossAmountCents: plan.contract.amountCents,
              freelancerFeeAmountCents: plan.fees.freelancerFeeAmountCents,
              platformFeeAmountCents: plan.fees.platformAmountCents,
              gatewayFeeAmountCents: plan.fees.gatewayFeeAmountCents,
              freelancerNetAmountCents: plan.fees.freelancerNetAmountCents,
            })),
          })
        : {
            status: PaymentStatus.PAID,
            gatewayTransactionId: `wallet_${eventId}_${Date.now()}`,
            gatewayPaymentId: `wallet_${eventId}_${Date.now()}`,
            checkoutUrl: undefined,
            paidAt: new Date(),
            gatewayFeeAmountCents: totals.gatewayFeeAmountCents,
            splits: splitPlans.map((plan) => ({
              recipientType: "FREELANCER" as const,
              contractId: plan.contract.id,
              freelancerId: plan.contract.freelancerId,
              amountCents: plan.fees.freelancerNetAmountCents,
              gatewayRecipientId: plan.gatewayRecipientId,
              gatewayWalletId: plan.gatewayWalletId,
            })),
          };

    return this.prisma.$transaction(async (tx) => {
      if (walletAmountCents > 0 && firstContract.company.wallet) {
        await tx.wallet.update({
          where: { id: firstContract.company.wallet.id },
          data: { balanceCents: { decrement: walletAmountCents } },
        });

        await tx.transaction.create({
          data: {
            walletId: firstContract.company.wallet.id,
            type: TransactionType.DEBIT,
            amountCents: walletAmountCents,
            description: `Pagamento marketplace do evento ${eventId}`,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          companyId: company.id,
          eventId,
          gateway: this.config.get<string>("PAYMENT_GATEWAY_PROVIDER", "simulated"),
          gatewayPaymentId: gatewayPayment.gatewayPaymentId,
          checkoutUrl: gatewayPayment.checkoutUrl,
          status: gatewayPayment.status,
          grossAmountCents: totals.grossAmountCents,
          freelancerAmountCents: totals.totalFreelancerAmountCents,
          platformFeeCents: totals.platformAmountCents,
          companyFeeAmountCents: totals.companyFeeAmountCents,
          freelancerFeeAmountCents: totals.freelancerFeeAmountCents,
          gatewayFeeAmountCents:
            gatewayPayment.gatewayFeeAmountCents ?? totals.gatewayFeeAmountCents,
          platformAmountCents: totals.platformAmountCents,
          totalFreelancerAmountCents: totals.totalFreelancerAmountCents,
          freelancerNetAmountCents: totals.totalFreelancerAmountCents,
          amountToChargeCompanyCents: totals.amountToChargeCompanyCents,
          walletAmountCents,
          gatewayAmountCents,
          gatewayTransactionId: gatewayPayment.gatewayTransactionId,
          paidAt: gatewayPayment.paidAt,
          splits: {
            create: splitPlans.map((plan) => ({
              contractId: plan.contract.id,
              freelancerId: plan.contract.freelancerId,
              recipientType: "FREELANCER",
              gatewayRecipientId: plan.gatewayRecipientId,
              gatewayWalletId: plan.gatewayWalletId,
              amountCents: plan.fees.freelancerNetAmountCents,
              grossAmountCents: plan.contract.amountCents,
              freelancerFeeAmountCents: plan.fees.freelancerFeeAmountCents,
              platformFeeAmountCents: plan.fees.platformAmountCents,
              gatewayFeeAmountCents: plan.fees.gatewayFeeAmountCents,
              freelancerNetAmountCents: plan.fees.freelancerNetAmountCents,
              splitStatus: PaymentSplitStatus.RESERVED,
              releaseStatus: PaymentSplitStatus.WAITING_RELEASE,
            })),
          },
        },
        include: this.paymentInclude(),
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "MARKETPLACE_PAYMENT_CREATED",
          entity: "Payment",
          entityId: payment.id,
          metadata: {
            eventId,
            companyId: company.id,
            contractIds: splitPlans.map((plan) => plan.contract.id),
            amountToChargeCompanyCents: totals.amountToChargeCompanyCents,
            walletAmountCents,
            gatewayAmountCents,
          },
        },
      });

      if (gatewayPayment.status === PaymentStatus.PAID) {
        await tx.contract.updateMany({
          where: { id: { in: splitPlans.map((plan) => plan.contract.id) } },
          data: { status: ContractStatus.CONFIRMED },
        });
      }

      if (gatewayPayment.status === PaymentStatus.PAID) {
        await tx.notification.createMany({
          data: splitPlans.map((plan) => ({
            userId: plan.contract.freelancer.userId,
            type: "PAYMENT_CONFIRMED",
            title: "Pagamento confirmado",
            body: `${company.companyName} confirmou o pagamento de ${plan.contract.event.name}.`,
          })),
        });
      }

      return payment;
    });
  }

  simulatePayment(userId: string, contractId: string) {
    return this.processPayment(userId, contractId);
  }

  async releaseToFreelancer(paymentId: string, now = new Date()) {
    const splits = await this.findReleasableSplits({ paymentId }, now);
    const released = [];

    for (const split of splits) {
      released.push(await this.releaseSplit(split.id, now));
    }

    return {
      paymentId,
      released: released.length,
      splits: released,
    };
  }

  async releaseSplit(splitId: string, now = new Date()) {
    const split = await this.prisma.paymentSplit.findUnique({
      where: { id: splitId },
      include: {
        payment: { include: { event: true, company: true } },
        contract: {
          include: {
            disputes: true,
            event: true,
            company: true,
            freelancer: { include: { wallet: true, user: true } },
          },
        },
        freelancer: { include: { wallet: true } },
        payout: true,
      },
    });

    if (!split) {
      throw new NotFoundException("Payment split not found");
    }

    this.assertSplitCanBeReleased(split, now);
    const wallet = split.freelancer.wallet;

    if (!wallet) {
      throw new BadRequestException("Freelancer wallet not found");
    }

    await this.paymentGateway.releaseSplit(split.id);

    return this.prisma.$transaction(async (tx) => {
      if (!split.payout) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceCents: { increment: split.freelancerNetAmountCents } },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.CREDIT,
            amountCents: split.freelancerNetAmountCents,
            description: `Liberação do split ${split.id}`,
          },
        });

        await tx.payout.create({
          data: {
            paymentSplitId: split.id,
            freelancerId: split.freelancerId,
            walletId: wallet.id,
            amountCents: split.freelancerNetAmountCents,
            status: PayoutStatus.PAID,
            paidAt: now,
          },
        });
      }

      await tx.contract.update({
        where: { id: split.contractId },
        data: { status: ContractStatus.PAID },
      });

      const releasedSplit = await tx.paymentSplit.update({
        where: { id: split.id },
        data: {
          splitStatus: PaymentSplitStatus.RELEASED,
          releaseStatus: PaymentSplitStatus.PAID,
          releasedAt: now,
        },
        include: {
          contract: { include: { event: true, freelancer: true } },
        },
      });

      await this.updatePaymentReleaseStatus(tx, split.paymentId);

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SPLIT_RELEASED",
          entity: "PaymentSplit",
          entityId: split.id,
          metadata: {
            paymentId: split.paymentId,
            contractId: split.contractId,
            freelancerId: split.freelancerId,
            amountCents: split.freelancerNetAmountCents,
            releasedAt: now.toISOString(),
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: split.contract.freelancer.userId,
          type: "PAYMENT_RELEASED",
          title: "Repasse liberado",
          body: `O repasse de ${split.contract.event.name} entrou na sua carteira.`,
        },
      });

      await this.companyAccess.notifyCompanyMembers(
        tx,
        split.contract.companyId,
        {
          type: "PAYMENT_RELEASED",
          title: "Pagamento liberado",
          body: `O repasse de ${split.contract.event.name} foi liberado ao profissional.`,
        },
      );

      return releasedSplit;
    });
  }

  async unblockSplit(splitId: string) {
    const split = await this.prisma.paymentSplit.findUnique({
      where: { id: splitId },
      include: {
        payment: true,
        contract: { include: { disputes: true, event: true, freelancer: true } },
      },
    });

    if (!split) {
      throw new NotFoundException("Payment split not found");
    }

    if (split.releaseStatus !== PaymentSplitStatus.BLOCKED) {
      throw new BadRequestException("Payment split is not blocked");
    }

    if (split.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Payment must be paid before unblocking");
    }

    const hasOpenDispute = split.contract.disputes.some(
      (dispute) =>
        dispute.status === DisputeStatus.OPEN ||
        dispute.status === DisputeStatus.UNDER_REVIEW,
    );

    if (hasOpenDispute) {
      throw new BadRequestException("Resolve the dispute before unblocking");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentSplit.update({
        where: { id: split.id },
        data: {
          splitStatus: PaymentSplitStatus.RESERVED,
          releaseStatus: PaymentSplitStatus.WAITING_RELEASE,
        },
        include: {
          contract: { include: { event: true, freelancer: true } },
          freelancer: true,
        },
      });

      if (split.contract.status === ContractStatus.DISPUTED) {
        await tx.contract.update({
          where: { id: split.contractId },
          data: { status: ContractStatus.CONFIRMED },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SPLIT_UNBLOCKED",
          entity: "PaymentSplit",
          entityId: split.id,
          metadata: {
            paymentId: split.paymentId,
            contractId: split.contractId,
          },
        },
      });

      return updated;
    });
  }

  async refundSplit(splitId: string) {
    const split = await this.prisma.paymentSplit.findUnique({
      where: { id: splitId },
      include: {
        payment: {
          include: {
            company: { include: { wallet: true } },
            splits: true,
          },
        },
        contract: { include: { event: true, company: true, freelancer: true } },
      },
    });

    if (!split) {
      throw new NotFoundException("Payment split not found");
    }

    if (
      split.releaseStatus === PaymentSplitStatus.PAID ||
      split.splitStatus === PaymentSplitStatus.RELEASED
    ) {
      throw new BadRequestException("Released split cannot be refunded here");
    }

    if (split.releaseStatus === PaymentSplitStatus.REFUNDED) {
      return split;
    }

    const companyFeeAmountCents = Math.max(
      split.platformFeeAmountCents - split.freelancerFeeAmountCents,
      0,
    );
    const refundAmountCents = split.grossAmountCents + companyFeeAmountCents;
    const shouldCreditCompany = split.payment.status !== PaymentStatus.CHARGEBACK;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentSplit.update({
        where: { id: split.id },
        data: {
          splitStatus: PaymentSplitStatus.REFUNDED,
          releaseStatus: PaymentSplitStatus.REFUNDED,
        },
        include: {
          contract: { include: { event: true, freelancer: true } },
          freelancer: true,
        },
      });

      await tx.contract.update({
        where: { id: split.contractId },
        data: { status: ContractStatus.PENDING_PAYMENT },
      });

      if (split.payment.company.wallet && shouldCreditCompany) {
        await tx.wallet.update({
          where: { id: split.payment.company.wallet.id },
          data: { balanceCents: { increment: refundAmountCents } },
        });

        await tx.transaction.create({
          data: {
            walletId: split.payment.company.wallet.id,
            type: TransactionType.REFUND,
            amountCents: refundAmountCents,
            description: `Estorno do split ${split.id}`,
          },
        });
      }

      await this.updatePaymentAfterTerminalSplit(tx, split.paymentId);

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SPLIT_REFUNDED",
          entity: "PaymentSplit",
          entityId: split.id,
          metadata: {
            paymentId: split.paymentId,
            contractId: split.contractId,
            refundAmountCents,
            creditedCompanyWallet: shouldCreditCompany,
          },
        },
      });

      await this.companyAccess.notifyCompanyMembers(
        tx,
        split.contract.companyId,
        {
          type: "PAYMENT_REFUNDED",
          title: "Pagamento estornado",
          body: `${split.contract.event.name}: o valor do profissional foi devolvido para a carteira.`,
        },
      );

      await tx.notification.create({
        data: {
          userId: split.contract.freelancer.userId,
          type: "PAYMENT_REFUNDED",
          title: "Pagamento estornado",
          body: `${split.contract.event.name}: o repasse foi estornado pela administração.`,
        },
      });

      return updated;
    });
  }

  async reprocessWebhookEvent(webhookEventId: string) {
    const webhookEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!webhookEvent) {
      throw new NotFoundException("Webhook event not found");
    }

    return this.processWebhook(webhookEvent.payload, {
      force: true,
      reprocessedWebhookId: webhookEvent.id,
    });
  }

  async processWebhook(
    payload: unknown,
    options: { force?: boolean; reprocessedWebhookId?: string } = {},
  ) {
    const result = await this.paymentGateway.processWebhook(payload);
    const gateway = this.config.get<string>("PAYMENT_GATEWAY_PROVIDER", "simulated");
    const gatewayEventId =
      typeof payload === "object" && payload !== null
        ? String(
            (payload as Record<string, unknown>).gatewayEventId ??
              `${gateway}_${result.event}_${result.transactionId}`,
          )
        : `${gateway}_${result.event}_${result.transactionId}`;

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { gatewayEventId },
    });

    if (existing?.processed && !options.force) {
      return { processed: false, duplicate: true, event: existing };
    }

    const webhookEvent = await this.prisma.paymentWebhookEvent.upsert({
      where: { gatewayEventId },
      create: {
        gateway,
        eventType: result.event,
        gatewayEventId,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
        processed: false,
      },
      update: {
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { gatewayTransactionId: result.transactionId },
          { gatewayPaymentId: result.transactionId },
        ],
      },
      include: {
        company: { include: { wallet: true } },
        event: true,
        splits: {
          include: {
            contract: { include: { event: true, freelancer: true } },
          },
        },
      },
    });

    if (payment) {
      await this.prisma.$transaction(async (tx) => {
        const nextStatus =
          result.status === PaymentStatus.PAID &&
          payment.status === PaymentStatus.RELEASED
            ? PaymentStatus.RELEASED
            : result.status;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: nextStatus,
            paidAt:
              result.status === PaymentStatus.PAID
                ? payment.paidAt ?? new Date()
                : payment.paidAt,
          },
        });

        if (result.status === PaymentStatus.PAID) {
          await tx.contract.updateMany({
            where: { id: { in: payment.splits.map((split) => split.contractId) } },
            data: { status: ContractStatus.CONFIRMED },
          });

          if (
            payment.status !== PaymentStatus.PAID &&
            payment.status !== PaymentStatus.RELEASED
          ) {
            const splits = await tx.paymentSplit.findMany({
              where: { paymentId: payment.id },
              include: { contract: { include: { freelancer: true, event: true } } },
            });

            await tx.notification.createMany({
              data: splits.map((split) => ({
                userId: split.contract.freelancer.userId,
                type: "PAYMENT_CONFIRMED",
                title: "Pagamento confirmado",
                body: `Pagamento confirmado para ${split.contract.event.name}.`,
              })),
            });
          }
        }

        if (
          result.status === PaymentStatus.FAILED ||
          result.status === PaymentStatus.CANCELLED
        ) {
          await this.failPendingPaymentSplits(tx, payment.id);
        }

        if (
          result.status === PaymentStatus.REFUNDED ||
          result.status === PaymentStatus.CHARGEBACK
        ) {
          await this.refundUnreleasedPaymentSplits(
            tx,
            payment,
            result.status,
          );
        }

        await tx.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: { processed: true },
        });

        await tx.auditLog.create({
          data: {
            action: "PAYMENT_WEBHOOK_PROCESSED",
            entity: "PaymentWebhookEvent",
            entityId: webhookEvent.id,
            metadata: {
              paymentId: payment.id,
              transactionId: result.transactionId,
              status: result.status,
              event: result.event,
              reprocessed: Boolean(options.reprocessedWebhookId),
            },
          },
        });

        if (options.reprocessedWebhookId) {
          await tx.auditLog.create({
            data: {
              action: "PAYMENT_WEBHOOK_REPROCESSED",
              entity: "PaymentWebhookEvent",
              entityId: webhookEvent.id,
              metadata: {
                paymentId: payment.id,
                originalWebhookEventId: options.reprocessedWebhookId,
                transactionId: result.transactionId,
                status: result.status,
                event: result.event,
              },
            },
          });
        }
      });
    }

    return {
      processed: Boolean(payment),
      duplicate: false,
      paymentId: payment?.id,
      result,
    };
  }

  async processDueReleases(now = new Date()) {
    const paidSplits = await this.findReleasableSplits({}, now);
    const released = [];

    for (const split of paidSplits) {
      const releasedSplit = await this.releaseSplit(split.id, now);
      released.push(releasedSplit);
      await this.prisma.auditLog.create({
        data: {
          action: "AUTO_PAYMENT_SPLIT_RELEASED",
          entity: "PaymentSplit",
          entityId: split.id,
          metadata: {
            paymentId: split.paymentId,
            contractId: split.contractId,
            releasedAt: now.toISOString(),
            deadlineAt: this.addBusinessDays(
              split.contract.endsAt,
              1,
            ).toISOString(),
          },
        },
      });
    }

    return {
      checked: paidSplits.length,
      eligible: paidSplits.length,
      released: released.length,
      splits: released,
    };
  }

  async processPostEventAutomation(now = new Date()) {
    const reminders = await this.notifyCompaniesWithOpenReviewWindow(now);
    const releases = await this.processDueReleases(now);

    return {
      reminders,
      releases,
    };
  }

  private paymentInclude(freelancerId?: string) {
    return {
      company: { select: publicCompanySelect },
      event: true,
      splits: {
        where: freelancerId ? { freelancerId } : undefined,
        include: {
          freelancer: { select: publicFreelancerSelect },
          contract: {
            include: {
              event: true,
              company: { select: publicCompanySelect },
              freelancer: { select: publicFreelancerSelect },
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    };
  }

  private calculatePaymentTotals(splitPlans: SplitPlan[]) {
    const contractAmountCents = splitPlans.reduce(
      (total, plan) => total + plan.contract.amountCents,
      0,
    );
    const companyFeeAmountCents = splitPlans.reduce(
      (total, plan) => total + plan.fees.companyFeeAmountCents,
      0,
    );
    const freelancerFeeAmountCents = splitPlans.reduce(
      (total, plan) => total + plan.fees.freelancerFeeAmountCents,
      0,
    );
    const gatewayFeeAmountCents = splitPlans.reduce(
      (total, plan) => total + plan.fees.gatewayFeeAmountCents,
      0,
    );
    const platformAmountCents = companyFeeAmountCents + freelancerFeeAmountCents;
    const totalFreelancerAmountCents = splitPlans.reduce(
      (total, plan) => total + plan.fees.freelancerNetAmountCents,
      0,
    );
    const amountToChargeCompanyCents =
      contractAmountCents + companyFeeAmountCents;

    return {
      grossAmountCents: amountToChargeCompanyCents,
      companyFeeAmountCents,
      freelancerFeeAmountCents,
      gatewayFeeAmountCents,
      platformAmountCents,
      totalFreelancerAmountCents,
      amountToChargeCompanyCents,
    };
  }

  private assertCompanyVerified(company: { verificationStatus: string }) {
    if (company.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Company must be verified");
    }
  }

  private assertPayableContract(contract: PayableContract) {
    if (contract.status !== ContractStatus.PENDING_PAYMENT) {
      throw new BadRequestException("Contract is not awaiting payment");
    }

    if (contract.freelancer.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Contract participants must be verified");
    }

    const inactiveStatuses: PaymentSplitStatus[] = [
      PaymentSplitStatus.FAILED,
      PaymentSplitStatus.REFUNDED,
    ];
    const hasActiveSplit = contract.paymentSplits.some(
      (split) => !inactiveStatuses.includes(split.releaseStatus),
    );

    if (hasActiveSplit) {
      throw new BadRequestException("Contract already has a payment split");
    }
  }

  private async ensureFreelancerGatewayAccount(
    freelancer: PayableContract["freelancer"],
  ) {
    const gateway = this.currentGatewayProvider();
    const existing = freelancer.gatewayAccounts.find(
      (account) =>
        account.gateway === gateway &&
        account.gatewayRecipientId &&
        account.status === GatewayAccountStatus.ACTIVE &&
        account.kycStatus === GatewayKycStatus.APPROVED,
    );

    if (existing?.gatewayRecipientId) {
      return existing;
    }

    throw new BadRequestException(
      "O freelancer ainda não configurou os dados de recebimento.",
    );
  }

  private requireGatewayRecipientId(account: { gatewayRecipientId: string | null }) {
    if (!account.gatewayRecipientId) {
      throw new BadRequestException("Freelancer gateway recipient is required");
    }

    return account.gatewayRecipientId;
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

  private async findReleasableSplits(
    where: Prisma.PaymentSplitWhereInput,
    now: Date,
  ) {
    const splits = await this.prisma.paymentSplit.findMany({
      where: {
        ...where,
        releaseStatus: PaymentSplitStatus.WAITING_RELEASE,
        payment: { status: PaymentStatus.PAID },
        contract: {
          status: { in: [ContractStatus.CONFIRMED, ContractStatus.COMPLETED] },
        },
      },
      include: {
        payment: true,
        contract: {
          include: {
            disputes: true,
            event: true,
            freelancer: { include: { wallet: true, user: true } },
          },
        },
        freelancer: { include: { wallet: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return splits.filter((split) => {
      const hasBlockingDispute = split.contract.disputes.some(
        (dispute) =>
          dispute.status === DisputeStatus.OPEN ||
          dispute.status === DisputeStatus.UNDER_REVIEW,
      );

      return (
        !hasBlockingDispute &&
        now >= this.addBusinessDays(split.contract.endsAt, 1)
      );
    });
  }

  private assertSplitCanBeReleased(
    split: Prisma.PaymentSplitGetPayload<{
      include: {
        payment: true;
        contract: { include: { disputes: true } };
        freelancer: { include: { wallet: true } };
      };
    }>,
    now: Date,
  ) {
    if (split.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException("Payment must be paid before release");
    }

    if (split.releaseStatus !== PaymentSplitStatus.WAITING_RELEASE) {
      throw new BadRequestException("Payment split is not waiting release");
    }

    if (
      split.contract.status !== ContractStatus.CONFIRMED &&
      split.contract.status !== ContractStatus.COMPLETED
    ) {
      throw new BadRequestException("Contract is not eligible for release");
    }

    if (now < this.addBusinessDays(split.contract.endsAt, 1)) {
      throw new BadRequestException(
        "Payment cannot be released before deadline",
      );
    }

    const hasBlockingDispute = split.contract.disputes.some(
      (dispute) =>
        dispute.status === DisputeStatus.OPEN ||
        dispute.status === DisputeStatus.UNDER_REVIEW,
    );

    if (hasBlockingDispute) {
      throw new BadRequestException(
        "Payment cannot be released with open dispute",
      );
    }
  }

  private async updatePaymentReleaseStatus(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ) {
    const remaining = await tx.paymentSplit.count({
      where: {
        paymentId,
        releaseStatus: {
          in: [PaymentSplitStatus.WAITING_RELEASE, PaymentSplitStatus.RESERVED],
        },
      },
    });

    if (remaining === 0) {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.RELEASED },
      });
    }
  }

  private async updatePaymentAfterTerminalSplit(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ) {
    const activeSplits = await tx.paymentSplit.count({
      where: {
        paymentId,
        releaseStatus: {
          notIn: [
            PaymentSplitStatus.FAILED,
            PaymentSplitStatus.REFUNDED,
            PaymentSplitStatus.PAID,
          ],
        },
      },
    });

    if (activeSplits > 0) {
      return;
    }

    const paidSplits = await tx.paymentSplit.count({
      where: { paymentId, releaseStatus: PaymentSplitStatus.PAID },
    });

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status:
          paidSplits > 0 ? PaymentStatus.RELEASED : PaymentStatus.REFUNDED,
      },
    });
  }

  private async failPendingPaymentSplits(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ) {
    const failedSplits = await tx.paymentSplit.findMany({
      where: {
        paymentId,
        releaseStatus: {
          in: [
            PaymentSplitStatus.RESERVED,
            PaymentSplitStatus.WAITING_RELEASE,
            PaymentSplitStatus.PENDING,
          ],
        },
      },
      select: { id: true, contractId: true },
    });

    if (!failedSplits.length) {
      return;
    }

    await tx.paymentSplit.updateMany({
      where: { id: { in: failedSplits.map((split) => split.id) } },
      data: {
        splitStatus: PaymentSplitStatus.FAILED,
        releaseStatus: PaymentSplitStatus.FAILED,
      },
    });

    await tx.contract.updateMany({
      where: { id: { in: failedSplits.map((split) => split.contractId) } },
      data: { status: ContractStatus.PENDING_PAYMENT },
    });
  }

  private async refundUnreleasedPaymentSplits(
    tx: Prisma.TransactionClient,
    payment: Prisma.PaymentGetPayload<{
      include: {
        company: { include: { wallet: true } };
        event: true;
        splits: {
          include: {
            contract: { include: { event: true; freelancer: true } };
          };
        };
      };
    }>,
    status: PaymentStatus,
  ) {
    const refundableSplits = payment.splits.filter(
      (split) =>
        split.releaseStatus !== PaymentSplitStatus.PAID &&
        split.releaseStatus !== PaymentSplitStatus.REFUNDED,
    );

    if (!refundableSplits.length) {
      return;
    }

    const refundAmountCents = refundableSplits.reduce((total, split) => {
      const companyFeeAmountCents = Math.max(
        split.platformFeeAmountCents - split.freelancerFeeAmountCents,
        0,
      );
      return total + split.grossAmountCents + companyFeeAmountCents;
    }, 0);

    await tx.paymentSplit.updateMany({
      where: { id: { in: refundableSplits.map((split) => split.id) } },
      data: {
        splitStatus:
          status === PaymentStatus.CHARGEBACK
            ? PaymentSplitStatus.BLOCKED
            : PaymentSplitStatus.REFUNDED,
        releaseStatus:
          status === PaymentStatus.CHARGEBACK
            ? PaymentSplitStatus.BLOCKED
            : PaymentSplitStatus.REFUNDED,
      },
    });

    await tx.contract.updateMany({
      where: { id: { in: refundableSplits.map((split) => split.contractId) } },
      data: {
        status:
          status === PaymentStatus.CHARGEBACK
            ? ContractStatus.DISPUTED
            : ContractStatus.PENDING_PAYMENT,
      },
    });

    if (payment.company.wallet && status === PaymentStatus.REFUNDED) {
      await tx.wallet.update({
        where: { id: payment.company.wallet.id },
        data: { balanceCents: { increment: refundAmountCents } },
      });

      await tx.transaction.create({
        data: {
          walletId: payment.company.wallet.id,
          type: TransactionType.REFUND,
          amountCents: refundAmountCents,
          description: `Estorno do pagamento ${payment.id}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action:
          status === PaymentStatus.CHARGEBACK
            ? "PAYMENT_CHARGEBACK_BLOCKED_SPLITS"
            : "PAYMENT_REFUNDED_SPLITS",
        entity: "Payment",
        entityId: payment.id,
        metadata: {
          status,
          splitIds: refundableSplits.map((split) => split.id),
          refundAmountCents,
        },
      },
    });
  }

  private async notifyCompaniesWithOpenReviewWindow(now: Date) {
    const splits = await this.prisma.paymentSplit.findMany({
      where: {
        releaseStatus: PaymentSplitStatus.WAITING_RELEASE,
        payment: { status: PaymentStatus.PAID },
        contract: {
          status: ContractStatus.CONFIRMED,
          endsAt: { lte: now },
        },
      },
      include: {
        payment: true,
        contract: {
          include: {
            disputes: true,
            event: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    let sent = 0;

    for (const split of splits) {
      const deadline = this.addBusinessDays(split.contract.endsAt, 1);

      if (now >= deadline) {
        continue;
      }

      const hasBlockingDispute = split.contract.disputes.some(
        (dispute) =>
          dispute.status === DisputeStatus.OPEN ||
          dispute.status === DisputeStatus.UNDER_REVIEW,
      );

      if (hasBlockingDispute) {
        continue;
      }

      const alreadySent = await this.prisma.auditLog.findFirst({
        where: {
          action: "POST_EVENT_REVIEW_REMINDER_SENT",
          entity: "PaymentSplit",
          entityId: split.id,
        },
        select: { id: true },
      });

      if (alreadySent) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await this.companyAccess.notifyCompanyMembers(
          tx,
          split.contract.companyId,
          {
            type: "POST_EVENT_REVIEW_PENDING",
            title: "Evento finalizado",
            body: `${split.contract.event.name}: avalie o profissional ou marque no-show até ${deadline.toLocaleDateString("pt-BR")}.`,
          },
        );

        await tx.auditLog.create({
          data: {
            action: "POST_EVENT_REVIEW_REMINDER_SENT",
            entity: "PaymentSplit",
            entityId: split.id,
            metadata: {
              paymentId: split.paymentId,
              contractId: split.contractId,
              eventId: split.contract.eventId,
              deadlineAt: deadline.toISOString(),
              sentAt: now.toISOString(),
            },
          },
        });
      });

      sent += 1;
    }

    return {
      checked: splits.length,
      sent,
    };
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
