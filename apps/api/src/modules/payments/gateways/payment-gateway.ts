import {
  GatewayAccountStatus,
  GatewayKycStatus,
  PaymentStatus,
} from "@prisma/client";

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

export type PaymentGatewayMarketplaceSplitInput = {
  contractId: string;
  freelancerId: string;
  gatewayRecipientId: string;
  gatewayWalletId?: string | null;
  grossAmountCents: number;
  freelancerFeeAmountCents: number;
  platformFeeAmountCents: number;
  gatewayFeeAmountCents: number;
  freelancerNetAmountCents: number;
};

export type PaymentGatewayMarketplacePaymentInput = {
  eventId: string;
  companyId: string;
  grossAmountCents: number;
  companyFeeAmountCents: number;
  gatewayFeeAmountCents: number;
  platformAmountCents: number;
  totalFreelancerAmountCents: number;
  amountToChargeCompanyCents: number;
  walletAmountCents: number;
  gatewayAmountCents: number;
  paymentMethod?: PaymentMethod;
  splits: PaymentGatewayMarketplaceSplitInput[];
};

export type PaymentGatewayChargeResult = {
  status: PaymentStatus;
  gatewayTransactionId: string;
  gatewayPaymentId?: string;
  checkoutUrl?: string;
  paidAt: Date | null;
  gatewayFeeAmountCents?: number;
  splits: {
    recipientType: PaymentRecipientType;
    contractId?: string;
    freelancerId?: string;
    amountCents: number;
    gatewayRecipientId: string;
    gatewayWalletId?: string | null;
  }[];
};

export type PaymentGatewayRecipientInput = {
  freelancerId: string;
  userId?: string;
  name: string;
  document?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    postalCode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
  bankAccount?: {
    bankCode?: string | null;
    agency?: string | null;
    account?: string | null;
    accountDigit?: string | null;
    accountType?: string | null;
  };
  pix?: {
    key?: string | null;
    keyType?: string | null;
  };
  bankData?: unknown;
};

export type PaymentGatewayRecipientResult = {
  gatewayRecipientId: string;
  gatewayWalletId?: string | null;
  status?: GatewayAccountStatus | string;
  kycStatus?: GatewayKycStatus | string;
  raw?: Record<string, unknown>;
};

export type PaymentGatewayRecipientStatusResult = {
  status: GatewayAccountStatus | string;
  kycStatus?: GatewayKycStatus | string;
  raw?: Record<string, unknown>;
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
  createCustomer(input: {
    userId: string;
    companyId?: string;
    name: string;
    document?: string | null;
  }): Promise<{ gatewayCustomerId: string }>;
  createCharge(
    input: PaymentGatewayChargeInput,
  ): Promise<PaymentGatewayChargeResult>;
  createMarketplacePayment(
    input: PaymentGatewayMarketplacePaymentInput,
  ): Promise<PaymentGatewayChargeResult>;
  confirmCharge(transactionId: string): Promise<PaymentGatewayChargeResult>;
  cancelCharge(transactionId: string): Promise<void>;
  refundCharge(transactionId: string, amountCents?: number): Promise<void>;
  createRecipient(
    input: PaymentGatewayRecipientInput,
  ): Promise<PaymentGatewayRecipientResult>;
  updateRecipient(
    input: PaymentGatewayRecipientInput & { gatewayRecipientId: string },
  ): Promise<PaymentGatewayRecipientResult>;
  createSplit(input: PaymentGatewaySplitInput): Promise<void>;
  releaseSplit(splitId: string): Promise<void>;
  processWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<PaymentGatewayWebhookResult>;
  getTransactionStatus(transactionId: string): Promise<PaymentStatus>;
  getRecipientStatus(
    recipientId: string,
  ): Promise<PaymentGatewayRecipientStatusResult>;
}
