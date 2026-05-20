import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles(UserRole.FREELANCER)
  @Get("opportunities")
  listOpportunities(@CurrentUser() user: CurrentUserPayload) {
    return this.applicationsService.listOpportunities(user.sub);
  }

  @Roles(UserRole.FREELANCER)
  @Get("mine")
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.applicationsService.listMine(user.sub);
  }

  @Roles(UserRole.FREELANCER)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @Get("received")
  listReceived(@CurrentUser() user: CurrentUserPayload) {
    return this.applicationsService.listReceived(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/accept")
  accept(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.applicationsService.accept(user.sub, id);
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/decline")
  decline(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.applicationsService.decline(user.sub, id);
  }
}
