import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ChatService } from "./chat.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Get("threads")
  listThreads(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.listThreads(user.sub);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER)
  @Post("threads/:id/messages")
  createMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.chatService.createMessage(user.sub, id, dto);
  }
}
