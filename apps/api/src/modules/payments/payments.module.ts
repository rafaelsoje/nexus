import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AsaasPaymentGateway } from "./gateways/asaas-payment.gateway";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway";
import { PagarmePaymentGateway } from "./gateways/pagarme-payment.gateway";
import { RealPaymentGateway } from "./gateways/real-payment.gateway";
import { SimulatedPaymentGateway } from "./gateways/simulated-payment.gateway";
import { PaymentsController } from "./payments.controller";
import {
  GenericPaymentsWebhookController,
  PaymentsWebhookController,
} from "./payments-webhook.controller";
import { PaymentsService } from "./payments.service";
import { PostEventAutomationService } from "./post-event-automation.service";

@Module({
  controllers: [
    PaymentsController,
    PaymentsWebhookController,
    GenericPaymentsWebhookController,
  ],
  providers: [
    PaymentsService,
    PostEventAutomationService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider =
          config.get<string>("PAYMENT_GATEWAY_PROVIDER") ??
          config.get<string>("PAYMENT_GATEWAY") ??
          "simulated";

        if (provider === "real") {
          return new RealPaymentGateway();
        }

        if (provider === "asaas") {
          return new AsaasPaymentGateway(config);
        }

        if (provider === "pagarme") {
          return new PagarmePaymentGateway(config);
        }

        if (provider === "simulated") {
          return new SimulatedPaymentGateway(config);
        }

        throw new Error(`Unknown payment gateway provider "${provider}"`);
      },
    },
  ],
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
