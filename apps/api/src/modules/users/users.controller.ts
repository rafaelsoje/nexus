import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findPrivateProfile(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  list() {
    return this.usersService.listForAdmin();
  }
}
