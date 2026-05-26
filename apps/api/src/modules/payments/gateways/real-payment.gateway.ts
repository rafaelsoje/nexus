import { Injectable, NotImplementedException } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import {
  PaymentGateway,
  PaymentGatewayChargeInput,
  PaymentGatewayChargeResult,
  PaymentGatewayMarketplacePaymentInput,
  PaymentGatewayRecipientInput,
  PaymentGatewayRecipientResult,
  PaymentGatewayRecipientStatusResult,
  PaymentGatewaySplitInput,
  PaymentGatewayWebhookResult,
} from "./payment-gateway";

@Injectable()
export class RealPaymentGateway implements PaymentGateway {
  async createCustomer(_input: {
    userId: string;
    companyId?: string;
    name: string;
    document?: string | null;
  }): Promise<{ gatewayCustomerId: string }> {
    this.notConfigured();
  }

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

  async createMarketplacePayment(
    _input: PaymentGatewayMarketplacePaymentInput,
  ): Promise<PaymentGatewayChargeResult> {
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

  async updateRecipient(
    _input: PaymentGatewayRecipientInput & { gatewayRecipientId: string },
  ): Promise<PaymentGatewayRecipientResult> {
    this.notConfigured();
  }

  async createSplit(_input: PaymentGatewaySplitInput): Promise<void> {
    this.notConfigured();
  }

  async releaseSplit(_splitId: string): Promise<void> {
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

  async getRecipientStatus(
    _recipientId: string,
  ): Promise<PaymentGatewayRecipientStatusResult> {
    this.notConfigured();
  }

  protected notConfigured(): never {
    throw new NotImplementedException(
      "Real payment gateway is not configured yet",
    );
  }
}
