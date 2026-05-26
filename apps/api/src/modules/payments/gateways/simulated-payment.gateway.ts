import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GatewayAccountStatus,
  GatewayKycStatus,
  PaymentStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  PaymentGateway,
  PaymentGatewayChargeInput,
  PaymentGatewayChargeResult,
  PaymentGatewayMarketplacePaymentInput,
  PaymentGatewayRecipientInput,
  PaymentGatewayRecipientResult,
  PaymentGatewaySplitInput,
  PaymentWebhookEvent,
  PaymentGatewayWebhookResult,
} from "./payment-gateway";

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

  async createCustomer(input: {
    userId: string;
  }): Promise<{ gatewayCustomerId: string }> {
    return { gatewayCustomerId: `customer_${input.userId}` };
  }

  async createCharge(
    input: PaymentGatewayChargeInput,
  ): Promise<PaymentGatewayChargeResult> {
    const transactionPrefix = this.config.get<string>(
      "PAYMENT_GATEWAY_TRANSACTION_PREFIX",
      "sim",
    );
    const platformRecipientId = this.config.get<string>(
      "PAYMENT_GATEWAY_PLATFORM_RECIPIENT_ID",
      "platform",
    );

    return {
      status: PaymentStatus.PAID,
      gatewayTransactionId: `${transactionPrefix}_${Date.now()}`,
      paidAt: new Date(),
      gatewayFeeAmountCents: input.gatewayFeeAmountCents,
      splits: [
        {
          recipientType: "FREELANCER",
          amountCents: input.amountToReleaseFreelancerCents,
          gatewayRecipientId: `freelancer_${input.freelancerId}`,
        },
        {
          recipientType: "PLATFORM",
          amountCents: input.platformAmountCents,
          gatewayRecipientId: platformRecipientId,
        },
      ],
    };
  }

  async confirmCharge(
    transactionId: string,
  ): Promise<PaymentGatewayChargeResult> {
    return {
      status: PaymentStatus.PAID,
      gatewayTransactionId: transactionId,
      paidAt: new Date(),
      gatewayFeeAmountCents: 0,
      splits: [],
    };
  }

  async cancelCharge() {
    return undefined;
  }

  async refundCharge() {
    return undefined;
  }

  async createRecipient(
    input: PaymentGatewayRecipientInput,
  ): Promise<PaymentGatewayRecipientResult> {
    const id = randomUUID();

    return {
      gatewayRecipientId: `sim_recipient_${id}`,
      gatewayWalletId: `sim_wallet_${id}`,
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
      raw: {
        provider: "simulated",
        freelancerId: input.freelancerId,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async updateRecipient(
    input: PaymentGatewayRecipientInput & { gatewayRecipientId: string },
  ): Promise<PaymentGatewayRecipientResult> {
    return {
      gatewayRecipientId: input.gatewayRecipientId,
      gatewayWalletId: `sim_wallet_${input.gatewayRecipientId}`,
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
      raw: {
        provider: "simulated",
        freelancerId: input.freelancerId,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async createMarketplacePayment(
    input: PaymentGatewayMarketplacePaymentInput,
  ): Promise<PaymentGatewayChargeResult> {
    const transactionPrefix = this.config.get<string>(
      "PAYMENT_GATEWAY_TRANSACTION_PREFIX",
      "sim",
    );
    const platformRecipientId = this.config.get<string>(
      "PAYMENT_GATEWAY_PLATFORM_RECIPIENT_ID",
      "platform",
    );
    const gatewayPaymentId = `${transactionPrefix}_marketplace_${Date.now()}`;

    return {
      status: PaymentStatus.WAITING_PAYMENT,
      gatewayTransactionId: gatewayPaymentId,
      gatewayPaymentId,
      checkoutUrl: `/checkout/simulado/${gatewayPaymentId}`,
      paidAt: null,
      gatewayFeeAmountCents: input.gatewayFeeAmountCents,
      splits: [
        ...input.splits.map((split) => ({
          recipientType: "FREELANCER" as const,
          contractId: split.contractId,
          freelancerId: split.freelancerId,
          amountCents: split.freelancerNetAmountCents,
          gatewayRecipientId: split.gatewayRecipientId,
          gatewayWalletId: split.gatewayWalletId,
        })),
        {
          recipientType: "PLATFORM" as const,
          amountCents: input.platformAmountCents,
          gatewayRecipientId: platformRecipientId,
        },
      ],
    };
  }

  async createSplit(_input: PaymentGatewaySplitInput) {
    return undefined;
  }

  async releaseSplit() {
    return undefined;
  }

  async processWebhook(payload: unknown): Promise<PaymentGatewayWebhookResult> {
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};

    const status = String(data.status ?? "PAID") as keyof typeof PaymentStatus;
    const event = String(data.event ?? "PAYMENT_APPROVED");

    return {
      event: event as PaymentWebhookEvent,
      transactionId: String(data.transactionId ?? "simulated_webhook"),
      status: PaymentStatus[status] ?? PaymentStatus.PAID,
      metadata: data,
    };
  }

  async getTransactionStatus() {
    return PaymentStatus.PAID;
  }

  async getRecipientStatus() {
    return {
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
      raw: { provider: "simulated", checkedAt: new Date().toISOString() },
    };
  }
}
