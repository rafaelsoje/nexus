import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
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
import { InviteCompanyMemberDto } from "./dto/invite-company-member.dto";
import { AcceptCompanyInvitationDto } from "./dto/accept-company-invitation.dto";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Roles(UserRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("profile")
  createProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.companiesService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.companiesService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get("profile")
  myProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.companiesService.findMyPrivateProfile(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get("team")
  team(@CurrentUser() user: CurrentUserPayload) {
    return this.companiesService.listTeam(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("team/invitations")
  inviteMember(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteCompanyMemberDto,
  ) {
    return this.companiesService.inviteMember(user.sub, dto);
  }

  @Post("team/invitations/accept")
  acceptInvitation(@Body() dto: AcceptCompanyInvitationDto) {
    return this.companiesService.acceptInvitation(dto);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER, UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id/public")
  publicProfile(@Param("id") id: string) {
    return this.companiesService.findPublicProfile(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  listForAdmin() {
    return this.companiesService.listForAdmin();
  }
}
