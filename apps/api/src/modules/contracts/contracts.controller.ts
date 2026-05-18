import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ContractsService } from "./contracts.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.listMine(user.sub, user.role as UserRole);
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/confirm")
  confirm(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.contractsService.confirmByCompany(user.sub, id);
  }
}
