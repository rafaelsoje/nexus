import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { DisputesService } from "./disputes.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.disputesService.listMine(user.sub, user.role as UserRole);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(user.sub, user.role as UserRole, dto);
  }
}
