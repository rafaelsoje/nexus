import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WalletService } from "./wallet.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.FREELANCER)
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  myWallet(@CurrentUser() user: CurrentUserPayload) {
    return this.walletService.findMine(user.sub, user.role as UserRole);
  }
}
