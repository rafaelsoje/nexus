import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AnonymizeMyAccountDto } from "./dto/anonymize-my-account.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findPrivateProfile(user.sub);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Post("me/anonymize")
  anonymizeMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AnonymizeMyAccountDto,
  ) {
    return this.usersService.anonymizeMyAccount(user.sub, dto.password);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  list() {
    return this.usersService.listForAdmin();
  }
}
