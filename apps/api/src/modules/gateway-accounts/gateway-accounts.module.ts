import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { GatewayAccountsController } from "./gateway-accounts.controller";
import { GatewayAccountsService } from "./gateway-accounts.service";

@Module({
  imports: [PaymentsModule],
  controllers: [GatewayAccountsController],
  providers: [GatewayAccountsService],
  exports: [GatewayAccountsService],
})
export class GatewayAccountsModule {}
