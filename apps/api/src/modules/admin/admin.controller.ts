import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { AdminService } from "./admin.service";
import { AuditContext } from "./admin.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { ResolveDisputeFinancialDto } from "./dto/resolve-dispute-financial.dto";
import { UpdateAdminAccessDto } from "./dto/update-admin-access.dto";
import { UpdateDisputeStatusDto } from "./dto/update-dispute-status.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpdatePayoutStatusDto } from "./dto/update-payout-status.dto";
import { UpdateVerificationDto } from "./dto/update-verification.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.SUPPORT,
    AdminAccessLevel.READONLY,
  )
  @Get("users")
  users() {
    return this.adminService.listUsers();
  }

  @AdminAccess(AdminAccessLevel.OWNER, AdminAccessLevel.MANAGER)
  @Post("users/admins")
  createAdminUser(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.adminService.createAdminUser(
      dto,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(AdminAccessLevel.OWNER, AdminAccessLevel.MANAGER)
  @Patch("users/:id/admin-access")
  updateAdminAccess(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateAdminAccessDto,
  ) {
    return this.adminService.updateAdminAccess(
      id,
      dto.accessLevel,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(AdminAccessLevel.OWNER, AdminAccessLevel.MANAGER)
  @Patch("users/:id/status")
  updateUserStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(
      id,
      dto.isActive,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.SUPPORT,
    AdminAccessLevel.VERIFICATION,
    AdminAccessLevel.READONLY,
  )
  @Get("companies")
  companies() {
    return this.adminService.listCompanies();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.SUPPORT,
    AdminAccessLevel.VERIFICATION,
    AdminAccessLevel.READONLY,
  )
  @Get("freelancers")
  freelancers() {
    return this.adminService.listFreelancers();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.SUPPORT,
    AdminAccessLevel.READONLY,
  )
  @Get("events")
  events() {
    return this.adminService.listEvents();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.READONLY,
  )
  @Get("audit-logs")
  auditLogs(
    @Query("action") action?: string,
    @Query("entity") entity?: string,
    @Query("userId") userId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.adminService.listAuditLogs({
      action,
      entity,
      userId,
      dateFrom,
      dateTo,
    });
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.READONLY,
  )
  @Get("payments")
  payments() {
    return this.adminService.listPayments();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.READONLY,
  )
  @Get("payments/:id")
  paymentDetail(@Param("id") id: string) {
    return this.adminService.findPaymentDetail(id);
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.READONLY,
  )
  @Get("payment-webhooks")
  paymentWebhooks() {
    return this.adminService.listPaymentWebhooks();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("payment-webhooks/:id/reprocess")
  reprocessPaymentWebhook(@Param("id") id: string) {
    return this.adminService.reprocessPaymentWebhook(id);
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.READONLY,
  )
  @Get("payouts")
  payouts() {
    return this.adminService.listPayouts();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Patch("payouts/:id/status")
  updatePayoutStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.adminService.updatePayoutStatus(
      id,
      dto.status,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
    AdminAccessLevel.SUPPORT,
    AdminAccessLevel.READONLY,
  )
  @Get("disputes")
  disputes() {
    return this.adminService.listDisputes();
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.SUPPORT,
  )
  @Patch("disputes/:id/status")
  updateDisputeStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateDisputeStatusDto,
  ) {
    return this.adminService.updateDisputeStatus(
      id,
      dto.status,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.FINANCE,
  )
  @Post("disputes/:id/financial-resolution")
  resolveDisputeFinancial(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: ResolveDisputeFinancialDto,
  ) {
    return this.adminService.resolveDisputeFinancial(
      id,
      dto.resolution,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.VERIFICATION,
  )
  @Patch("companies/:id/verification")
  verifyCompany(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.adminService.updateCompanyVerification(
      id,
      dto.status,
      this.auditContext(user, request),
    );
  }

  @AdminAccess(
    AdminAccessLevel.OWNER,
    AdminAccessLevel.MANAGER,
    AdminAccessLevel.VERIFICATION,
  )
  @Patch("freelancers/:id/verification")
  verifyFreelancer(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.adminService.updateFreelancerVerification(
      id,
      dto.status,
      this.auditContext(user, request),
    );
  }

  private auditContext(
    user: CurrentUserPayload,
    request: Request,
  ): AuditContext {
    return {
      userId: user.sub,
      role: user.role,
      ip: request.ip,
      userAgent: request.get("user-agent"),
    };
  }
}
