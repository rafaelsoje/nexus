import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UpsertCompanyProfileDto } from "./dto/upsert-company-profile.dto";
import { CompaniesService } from "./companies.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Roles(UserRole.COMPANY)
  @Post("profile")
  createProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.companiesService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.companiesService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @Get("profile")
  myProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.companiesService.findMyPrivateProfile(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  listForAdmin() {
    return this.companiesService.listForAdmin();
  }
}
