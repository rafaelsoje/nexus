import { Module } from "@nestjs/common";
import { FreelancersController } from "./freelancers.controller";
import { FreelancersService } from "./freelancers.service";

@Module({
  controllers: [FreelancersController],
  providers: [FreelancersService],
  exports: [FreelancersService],
})
export class FreelancersModule {}
