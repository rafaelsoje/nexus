import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { FreelancersController } from "./freelancers.controller";
import { FreelancersService } from "./freelancers.service";

@Module({
  imports: [PaymentsModule],
  controllers: [FreelancersController],
  providers: [FreelancersService],
  exports: [FreelancersService],
})
export class FreelancersModule {}
