import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.listMine(user.sub);
  }

  @Patch(":id/read")
  markAsRead(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.notificationsService.markAsRead(user.sub, id);
  }
}
