import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway";
import { SimulatedPaymentGateway } from "./gateways/simulated-payment.gateway";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>(
          "PAYMENT_GATEWAY_PROVIDER",
          "simulated",
        );

        if (provider !== "simulated") {
          throw new Error(
            `Payment gateway provider "${provider}" is not implemented`,
          );
        }

        return new SimulatedPaymentGateway(config);
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
