import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listThreads(userId: string) {
    const user = await this.findUser(userId);

    return this.prisma.chatThread.findMany({
      where:
        user.role === UserRole.COMPANY
          ? { company: { userId } }
          : { freelancer: { userId } },
      orderBy: { updatedAt: "desc" },
      include: {
        event: true,
        company: { select: { id: true, companyName: true, city: true, state: true } },
        freelancer: {
          select: {
            id: true,
            displayName: true,
            city: true,
            state: true,
            user: { select: { name: true } },
          },
        },
        application: true,
        invitation: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });
  }

  async createMessage(
    userId: string,
    threadId: string,
    dto: CreateChatMessageDto,
  ) {
    const thread = await this.findParticipantThread(userId, threadId);

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          threadId: thread.id,
          senderId: userId,
          body: dto.body.trim(),
        },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });

      await tx.chatThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      const recipientUserId =
        thread.company.userId === userId
          ? thread.freelancer.userId
          : thread.company.userId;

      await tx.notification.create({
        data: {
          userId: recipientUserId,
          type: "CHAT_MESSAGE_RECEIVED",
          title: "Nova mensagem no chat",
          body: `${message.sender.name}: ${message.body.slice(0, 120)}`,
        },
      });

      return message;
    });
  }

  private async findParticipantThread(userId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        id: threadId,
        OR: [{ company: { userId } }, { freelancer: { userId } }],
      },
      include: {
        company: true,
        freelancer: true,
      },
    });

    if (!thread) {
      throw new NotFoundException("Chat thread not found");
    }

    return thread;
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (
      !user ||
      (user.role !== UserRole.COMPANY && user.role !== UserRole.FREELANCER)
    ) {
      throw new ForbiddenException("Chat is available only for participants");
    }

    return user;
  }
}
