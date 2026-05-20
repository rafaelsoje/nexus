import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway";
import { RealPaymentGateway } from "./gateways/real-payment.gateway";
import { SimulatedPaymentGateway } from "./gateways/simulated-payment.gateway";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PostEventAutomationService } from "./post-event-automation.service";

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PostEventAutomationService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>(
          "PAYMENT_GATEWAY_PROVIDER",
          "simulated",
        );

        if (provider === "real") {
          return new RealPaymentGateway();
        }

        if (provider !== "simulated") {
          throw new Error(`Unknown payment gateway provider "${provider}"`);
        }

        return new SimulatedPaymentGateway(config);
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
