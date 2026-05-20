import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentStatus } from "@prisma/client";
import {
  PaymentGateway,
  PaymentGatewayChargeInput,
  PaymentGatewayChargeResult,
} from "./payment-gateway";

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

  async charge(
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
      splits: [
        {
          recipientType: "FREELANCER",
          amountCents: input.freelancerAmountCents,
          gatewayRecipientId: `freelancer_${input.freelancerId}`,
        },
        {
          recipientType: "PLATFORM",
          amountCents: input.platformFeeCents,
          gatewayRecipientId: platformRecipientId,
        },
      ],
    };
  }
}
