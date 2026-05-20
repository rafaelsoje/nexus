import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  publicCompanySelect,
  publicFreelancerSelect,
} from "../../common/selectors/public-profiles";
import {
  CompanyAccessService,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async listThreads(userId: string) {
    const user = await this.findUser(userId);
    const companyMembership =
      user.role === UserRole.COMPANY
        ? await this.companyAccess.findMembership(userId, companyReadRoles)
        : null;

    return this.prisma.chatThread.findMany({
      where:
        user.role === UserRole.COMPANY
          ? { companyId: companyMembership?.companyId }
          : { freelancer: { userId } },
      orderBy: { updatedAt: "desc" },
      include: {
        event: true,
        company: { select: publicCompanySelect },
        freelancer: { select: publicFreelancerSelect },
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

      const notification = {
        type: "CHAT_MESSAGE_RECEIVED",
        title: "Nova mensagem no chat",
        body: `${message.sender.name}: ${message.body.slice(0, 120)}`,
      };

      if (thread.freelancer.userId === userId) {
        await this.companyAccess.notifyCompanyMembers(
          tx,
          thread.companyId,
          notification,
        );
      } else {
        await tx.notification.create({
          data: {
            userId: thread.freelancer.userId,
            ...notification,
          },
        });
      }

      return message;
    });
  }

  private async findParticipantThread(userId: string, threadId: string) {
    const user = await this.findUser(userId);
    const companyMembership =
      user.role === UserRole.COMPANY
        ? await this.companyAccess.findMembership(userId, companyReadRoles)
        : null;

    const thread = await this.prisma.chatThread.findFirst({
      where: {
        id: threadId,
        OR: [
          ...(companyMembership
            ? [{ companyId: companyMembership.companyId }]
            : []),
          { freelancer: { userId } },
        ],
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
