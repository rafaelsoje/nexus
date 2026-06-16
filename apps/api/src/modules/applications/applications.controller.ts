import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { SearchOpportunitiesDto } from "./dto/search-opportunities.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles(UserRole.FREELANCER)
  @Get("opportunities")
  listOpportunities(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: SearchOpportunitiesDto,
  ) {
    return this.applicationsService.listOpportunities(user.sub, query);
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

  @Roles(UserRole.FREELANCER)
  @Patch(":id")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.updateMine(user.sub, id, dto);
  }

  @Roles(UserRole.FREELANCER)
  @Post(":id/cancel")
  cancel(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.applicationsService.cancelMine(user.sub, id);
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
