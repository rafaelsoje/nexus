import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";

@Controller("payment-webhooks")
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("simulated")
  processSimulatedWebhook(@Body() payload: unknown) {
    return this.paymentsService.processWebhook(payload);
  }

  @Get("simulated/checkout/:gatewayPaymentId")
  async simulatedCheckout(@Param("gatewayPaymentId") gatewayPaymentId: string) {
    const payment =
      await this.paymentsService.findSimulatedCheckout(gatewayPaymentId);

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }
}

@Controller("webhooks/payments")
export class GenericPaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(":gateway")
  processGatewayWebhook(
    @Param("gateway") gateway: string,
    @Body() payload: unknown,
  ) {
    return this.paymentsService.processWebhook({
      ...(typeof payload === "object" && payload !== null ? payload : {}),
      gateway,
    });
  }
}
