import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminAccessLevel, UserRole } from "@prisma/client";
import { AdminAccess } from "../../common/decorators/admin-access.decorator";
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
    return this.paymentsService.processPayment(user.sub, contractId);
  }

  @Roles(UserRole.COMPANY)
  @Post("events/:eventId/pay")
  payEvent(
    @CurrentUser() user: CurrentUserPayload,
    @Param("eventId") eventId: string,
  ) {
    return this.paymentsService.processEventPayment(user.sub, eventId);
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("process-due-releases")
  processDueReleases() {
    return this.paymentsService.processPostEventAutomation();
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post(":id/release")
  releaseToFreelancer(@Param("id") id: string) {
    return this.paymentsService.releaseToFreelancer(id);
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("splits/:id/release")
  releaseSplit(@Param("id") id: string) {
    return this.paymentsService.releaseSplit(id);
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("splits/:id/unblock")
  unblockSplit(@Param("id") id: string) {
    return this.paymentsService.unblockSplit(id);
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("splits/:id/refund")
  refundSplit(@Param("id") id: string) {
    return this.paymentsService.refundSplit(id);
  }
}
