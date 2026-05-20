import { Injectable, NotImplementedException } from "@nestjs/common";
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
export class RealPaymentGateway implements PaymentGateway {
  async createCharge(
    _input: PaymentGatewayChargeInput,
  ): Promise<PaymentGatewayChargeResult> {
    this.notConfigured();
  }

  async confirmCharge(
    _transactionId: string,
  ): Promise<PaymentGatewayChargeResult> {
    this.notConfigured();
  }

  async cancelCharge(_transactionId: string): Promise<void> {
    this.notConfigured();
  }

  async refundCharge(
    _transactionId: string,
    _amountCents?: number,
  ): Promise<void> {
    this.notConfigured();
  }

  async createRecipient(
    _input: PaymentGatewayRecipientInput,
  ): Promise<PaymentGatewayRecipientResult> {
    this.notConfigured();
  }

  async createSplit(_input: PaymentGatewaySplitInput): Promise<void> {
    this.notConfigured();
  }

  async processWebhook(
    _payload: unknown,
  ): Promise<PaymentGatewayWebhookResult> {
    this.notConfigured();
  }

  async getTransactionStatus(_transactionId: string): Promise<PaymentStatus> {
    this.notConfigured();
  }

  private notConfigured(): never {
    throw new NotImplementedException(
      "Real payment gateway is not configured yet",
    );
  }
}
