import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentStatus } from "@prisma/client";
import {
  PaymentGateway,
  PaymentGatewayChargeInput,
  PaymentGatewayChargeResult,
  PaymentGatewayRecipientInput,
  PaymentGatewayRecipientResult,
  PaymentGatewaySplitInput,
  PaymentGatewayWebhookResult,
} from "./payment-gateway";

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

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
    return {
      gatewayRecipientId: `freelancer_${input.freelancerId}`,
    };
  }

  async createSplit(_input: PaymentGatewaySplitInput) {
    return undefined;
  }

  async processWebhook(payload: unknown): Promise<PaymentGatewayWebhookResult> {
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};

    return {
      event: "PAYMENT_APPROVED",
      transactionId: String(data.transactionId ?? "simulated_webhook"),
      status: PaymentStatus.PAID,
      metadata: data,
    };
  }

  async getTransactionStatus() {
    return PaymentStatus.PAID;
  }
}
