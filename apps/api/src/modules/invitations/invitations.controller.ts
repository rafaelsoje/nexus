import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateBulkInvitationDto } from "./dto/create-bulk-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { NegotiateInvitationAmountDto } from "./dto/negotiate-invitation-amount.dto";
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
  @Post("bulk")
  createBulk(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBulkInvitationDto,
  ) {
    return this.invitationsService.createBulk(user.sub, dto);
  }

  @Roles(UserRole.COMPANY)
  @Get("sent")
  listSent(@CurrentUser() user: CurrentUserPayload) {
    return this.invitationsService.listSent(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/cancel")
  cancel(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.invitationsService.cancel(user.sub, id);
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

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Post(":id/propose-amount")
  proposeAmount(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: NegotiateInvitationAmountDto,
  ) {
    return this.invitationsService.proposeAmount(user.sub, id, dto);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Post(":id/accept-amount")
  acceptAmount(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.invitationsService.acceptAmount(user.sub, id);
  }

  @Roles(UserRole.FREELANCER)
  @Post(":id/decline")
  decline(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.invitationsService.decline(user.sub, id);
  }
}
