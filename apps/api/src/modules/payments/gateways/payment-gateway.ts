import { PaymentStatus } from "@prisma/client";

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export type PaymentRecipientType = "FREELANCER" | "PLATFORM";
export type PaymentMethod = "CARD" | "BOLETO" | "PIX" | "WALLET";
export type PaymentWebhookEvent =
  | "PAYMENT_APPROVED"
  | "PAYMENT_FAILED"
  | "CHARGEBACK"
  | "REFUND"
  | "PAYOUT";

export type PaymentGatewayChargeInput = {
  contractId: string;
  companyId: string;
  freelancerId: string;
  grossAmountCents: number;
  freelancerAmountCents: number;
  freelancerNetAmountCents: number;
  companyFeeAmountCents: number;
  freelancerFeeAmountCents: number;
  gatewayFeeAmountCents: number;
  platformFeeCents: number;
  platformAmountCents: number;
  amountToChargeCompanyCents: number;
  amountToReleaseFreelancerCents: number;
  walletAmountCents: number;
  gatewayAmountCents: number;
  paymentMethod?: PaymentMethod;
};

export type PaymentGatewayChargeResult = {
  status: PaymentStatus;
  gatewayTransactionId: string;
  paidAt: Date | null;
  gatewayFeeAmountCents?: number;
  splits: {
    recipientType: PaymentRecipientType;
    amountCents: number;
    gatewayRecipientId: string;
  }[];
};

export type PaymentGatewayRecipientInput = {
  freelancerId: string;
  name: string;
  document?: string | null;
  bankData?: unknown;
};

export type PaymentGatewayRecipientResult = {
  gatewayRecipientId: string;
};

export type PaymentGatewaySplitInput = {
  paymentId: string;
  transactionId: string;
  freelancerAmountCents: number;
  platformAmountCents: number;
};

export type PaymentGatewayWebhookResult = {
  event: PaymentWebhookEvent;
  transactionId: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
};

export interface PaymentGateway {
  createCharge(
    input: PaymentGatewayChargeInput,
  ): Promise<PaymentGatewayChargeResult>;
  confirmCharge(transactionId: string): Promise<PaymentGatewayChargeResult>;
  cancelCharge(transactionId: string): Promise<void>;
  refundCharge(transactionId: string, amountCents?: number): Promise<void>;
  createRecipient(
    input: PaymentGatewayRecipientInput,
  ): Promise<PaymentGatewayRecipientResult>;
  createSplit(input: PaymentGatewaySplitInput): Promise<void>;
  processWebhook(payload: unknown): Promise<PaymentGatewayWebhookResult>;
  getTransactionStatus(transactionId: string): Promise<PaymentStatus>;
}
