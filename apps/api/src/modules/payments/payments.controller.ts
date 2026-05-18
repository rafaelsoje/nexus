import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PaymentsService } from "./payments.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.COMPANY, UserRole.FREELANCER, UserRole.ADMIN)
  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listMine(user.sub, user.role as UserRole);
  }

  @Roles(UserRole.COMPANY)
  @Post("contracts/:contractId/pay")
  simulatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param("contractId") contractId: string,
  ) {
    return this.paymentsService.simulatePayment(user.sub, contractId);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/release")
  releaseToFreelancer(@Param("id") id: string) {
    return this.paymentsService.releaseToFreelancer(id);
  }
}
