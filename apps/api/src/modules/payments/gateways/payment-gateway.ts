import { PaymentStatus } from "@prisma/client";

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export type PaymentRecipientType = "FREELANCER" | "PLATFORM";

export type PaymentGatewayChargeInput = {
  contractId: string;
  companyId: string;
  freelancerId: string;
  grossAmountCents: number;
  freelancerAmountCents: number;
  platformFeeCents: number;
};

export type PaymentGatewayChargeResult = {
  status: PaymentStatus;
  gatewayTransactionId: string;
  paidAt: Date | null;
  splits: {
    recipientType: PaymentRecipientType;
    amountCents: number;
    gatewayRecipientId: string;
  }[];
};

export interface PaymentGateway {
  charge(input: PaymentGatewayChargeInput): Promise<PaymentGatewayChargeResult>;
}
