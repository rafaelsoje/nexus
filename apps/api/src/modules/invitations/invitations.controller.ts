import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Roles(UserRole.COMPANY)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @Get("sent")
  listSent(@CurrentUser() user: CurrentUserPayload) {
    return this.invitationsService.listSent(user.sub);
  }

  @Roles(UserRole.FREELANCER)
  @Get("received")
  listReceived(@CurrentUser() user: CurrentUserPayload) {
    return this.invitationsService.listReceived(user.sub);
  }

  @Roles(UserRole.FREELANCER)
  @Post(":id/accept")
  accept(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.invitationsService.accept(user.sub, id);
  }

  @Roles(UserRole.FREELANCER)
  @Post(":id/decline")
  decline(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.invitationsService.decline(user.sub, id);
  }
}
