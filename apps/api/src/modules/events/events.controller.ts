import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateEventDto } from "./dto/create-event.dto";
import { SearchAvailableFreelancersDto } from "./dto/search-available-freelancers.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventsService } from "./events.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(UserRole.COMPANY)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(user.sub, dto, this.auditContext(user, request));
  }

  @Roles(UserRole.COMPANY)
  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.listMine(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @Get("available-freelancers")
  searchAvailableFreelancers(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: SearchAvailableFreelancersDto,
  ) {
    return this.eventsService.searchAvailableFreelancers(user.sub, query);
  }

  @Roles(UserRole.COMPANY)
  @Get(":id")
  findMine(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.eventsService.findMine(user.sub, id);
  }

  @Roles(UserRole.COMPANY)
  @Patch(":id")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user.sub, id, dto, this.auditContext(user, request));
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/duplicate")
  duplicate(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.eventsService.duplicate(user.sub, id, this.auditContext(user, request));
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/cancel")
  cancel(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.eventsService.cancel(user.sub, id, this.auditContext(user, request));
  }

  @Roles(UserRole.COMPANY)
  @Delete(":id")
  delete(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.eventsService.delete(user.sub, id, this.auditContext(user, request));
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
