import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminAccessLevel, UserRole } from "@prisma/client";
import { Request } from "express";
import { AdminAccess } from "../../common/decorators/admin-access.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UpsertGatewayAccountDto } from "./dto/upsert-gateway-account.dto";
import { GatewayAccountsService } from "./gateway-accounts.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class GatewayAccountsController {
  constructor(
    private readonly gatewayAccountsService: GatewayAccountsService,
  ) {}

  @Roles(UserRole.FREELANCER)
  @Post("gateway-accounts/freelancer/me")
  upsertMyFreelancerAccount(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Body() dto: UpsertGatewayAccountDto,
  ) {
    return this.gatewayAccountsService.upsertFreelancerAccount(
      user.sub,
      dto,
      this.auditContext(user, request),
    );
  }

  @Roles(UserRole.FREELANCER)
  @Get("gateway-accounts/freelancer/me")
  myFreelancerAccount(@CurrentUser() user: CurrentUserPayload) {
    return this.gatewayAccountsService.findMyFreelancerAccount(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.VERIFICATION,
    AdminAccessLevel.READONLY,
  )
  @Get("admin/gateway-accounts")
  listForAdmin(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
  ) {
    return this.gatewayAccountsService.listForAdmin(
      this.auditContext(user, request),
    );
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.VERIFICATION,
    AdminAccessLevel.READONLY,
  )
  @Get("admin/gateway-accounts/:id")
  findForAdmin(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.gatewayAccountsService.findForAdmin(
      id,
      this.auditContext(user, request),
    );
  }

  @Roles(UserRole.ADMIN)
  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.VERIFICATION,
  )
  @Post("admin/gateway-accounts/:id/recheck")
  recheckForAdmin(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.gatewayAccountsService.recheckForAdmin(
      id,
      this.auditContext(user, request),
    );
  }

  private auditContext(user: CurrentUserPayload, request: Request) {
    return {
      userId: user.sub,
      role: user.role,
      ip: request.ip,
      userAgent: request.get("user-agent"),
    };
  }
}
