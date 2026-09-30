import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationType, MemberRole } from '@prisma/client';
import { ChatGateway } from '../gateway/chat.gateway';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  generatePairKey(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  async getOrCreateDirectConversation(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot start a direct conversation with yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, username: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const pairKey = this.generatePairKey(currentUserId, targetUserId);

    // 1. Try finding existing conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: { pairKey },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    // 2. Create atomically with nested members
    try {
      conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          pairKey,
          createdById: currentUserId,
          members: {
            create: [
              { userId: currentUserId, role: MemberRole.OWNER },
              { userId: targetUserId, role: MemberRole.MEMBER },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (this.chatGateway) {
        this.chatGateway.notifyConversationCreated([currentUserId, targetUserId], conversation);
      }

      return conversation;
    } catch (err: any) {
      // If concurrent request created it first, fetch it
      if (err.code === 'P2002') {
        const existing = await this.prisma.conversation.findUnique({
          where: { pairKey },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        });
        if (existing) return existing;
      }
      this.logger.error(`Error creating direct conversation: ${err.message}`, err.stack);
      throw err;
    }
  }

  async createGroupConversation(
    currentUserId: string,
    name: string,
    description?: string,
    memberIds: string[] = [],
    avatarUrl?: string,
  ) {
    const trimmedName = name ? name.trim() : '';
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
      throw new BadRequestException('Group name must be between 2 and 50 characters');
    }

    const uniqueMemberIds = Array.from(
      new Set(memberIds.filter((id) => id && typeof id === 'string' && id !== currentUserId)),
    );

    // Validate that all specified member IDs actually exist in the database
    if (uniqueMemberIds.length > 0) {
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: uniqueMemberIds } },
        select: { id: true },
      });
      const existingIdSet = new Set(existingUsers.map((u) => u.id));
      const missing = uniqueMemberIds.filter((id) => !existingIdSet.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`One or more selected members do not exist`);
      }
    }

    // Atomically create the group conversation and its members using Prisma nested write
    const group = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: trimmedName,
        description: description?.trim() || null,
        avatarUrl: avatarUrl || null,
        createdById: currentUserId,
        members: {
          create: [
            { userId: currentUserId, role: MemberRole.OWNER },
            ...uniqueMemberIds.map((userId) => ({
              userId,
              role: MemberRole.MEMBER,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const allMemberIds = [currentUserId, ...uniqueMemberIds];
    if (this.chatGateway) {
      this.chatGateway.notifyConversationCreated(allMemberIds, group);
    }

    return group;
  }

  async getUserConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                text: true,
                senderId: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;
        const latestMessage = conv.messages[0] || null;

        // Unread count: messages sent after lastReadAt (or joinedAt) by other users
        const since = m.lastReadAt || m.joinedAt;
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: since },
            senderId: { not: userId },
          },
        });

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name,
          description: conv.description,
          avatarUrl: conv.avatarUrl,
          updatedAt: conv.updatedAt,
          latestMessage,
          unreadCount,
          lastReadAt: m.lastReadAt,
          lastReadMessageId: m.lastReadMessageId,
          members: conv.members.map((mem) => ({
            id: mem.id,
            role: mem.role,
            user: mem.user,
            lastReadAt: mem.lastReadAt,
            lastReadMessageId: mem.lastReadMessageId,
          })),
        };
      }),
    );
  }

  async getConversationById(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async markAsRead(conversationId: string, userId: string, messageId?: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const readAt = new Date();
    let targetMessageId = messageId;
    if (!targetMessageId) {
      const latestMsg = await this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      targetMessageId = latestMsg?.id;
    }

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: readAt,
        lastReadMessageId: targetMessageId || null,
      },
    });

    if (this.chatGateway) {
      this.chatGateway.notifyConversationRead(conversationId, userId, readAt, targetMessageId);
    }

    return { success: true, conversationId, readAt, lastReadMessageId: targetMessageId };
  }

  async addMembers(conversationId: string, currentUserId: string, memberIds: string[]) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot add members to a direct conversation');
    }

    const currentMember = conv.members.find((m) => m.userId === currentUserId);
    if (!currentMember || (currentMember.role !== MemberRole.OWNER && currentMember.role !== MemberRole.ADMIN)) {
      throw new ForbiddenException('Only group admins or owners can add members');
    }

    const existingMemberUserIds = new Set(conv.members.map((m) => m.userId));
    const toAdd = memberIds.filter((id) => !existingMemberUserIds.has(id));

    if (toAdd.length === 0) {
      return this.getConversationById(conversationId, currentUserId);
    }

    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: toAdd } },
      select: { id: true },
    });
    const validIds = validUsers.map((u) => u.id);

    await this.prisma.conversationMember.createMany({
      data: validIds.map((userId) => ({
        conversationId,
        userId,
        role: MemberRole.MEMBER,
      })),
      skipDuplicates: true,
    });

    const updated = await this.getConversationById(conversationId, currentUserId);

    if (this.chatGateway) {
      this.chatGateway.notifyConversationCreated(validIds, updated);
      this.chatGateway.notifyGroupUpdated(conversationId, {
        type: 'members_added',
        conversation: updated,
        addedUserIds: validIds,
      });
    }

    return updated;
  }

  async removeMember(conversationId: string, currentUserId: string, targetUserId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot remove members from a direct conversation');
    }

    const currentMember = conv.members.find((m) => m.userId === currentUserId);
    const targetMember = conv.members.find((m) => m.userId === targetUserId);

    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    if (!targetMember) {
      throw new NotFoundException('Target user is not a member of this conversation');
    }

    if (targetMember.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove the group owner');
    }

    if (currentMember.role !== MemberRole.OWNER && currentMember.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only group admins or owners can remove members');
    }

    await this.prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
    });

    if (this.chatGateway) {
      this.chatGateway.evictUserFromRoom(targetUserId, conversationId);
      this.chatGateway.notifyGroupUpdated(conversationId, {
        type: 'member_removed',
        removedUserId: targetUserId,
      });
    }

    return { success: true, removedUserId: targetUserId };
  }

  async leaveGroup(conversationId: string, currentUserId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot leave a direct conversation');
    }

    const currentMember = conv.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (currentMember.role === MemberRole.OWNER) {
      const otherMembers = conv.members.filter((m) => m.userId !== currentUserId);
      if (otherMembers.length > 0) {
        const nextOwner = otherMembers.find((m) => m.role === MemberRole.ADMIN) || otherMembers[0];
        await this.prisma.conversationMember.update({
          where: { id: nextOwner.id },
          data: { role: MemberRole.OWNER },
        });
      }
    }

    await this.prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (this.chatGateway) {
      this.chatGateway.evictUserFromRoom(currentUserId, conversationId);
      this.chatGateway.notifyGroupUpdated(conversationId, {
        type: 'member_left',
        userId: currentUserId,
      });
    }

    return { success: true };
  }

  async updateGroup(
    conversationId: string,
    currentUserId: string,
    dto: { name?: string; description?: string; avatarUrl?: string },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException('Only groups can be updated');
    }

    const currentMember = conv.members.find((m) => m.userId === currentUserId);
    if (!currentMember || (currentMember.role !== MemberRole.OWNER && currentMember.role !== MemberRole.ADMIN)) {
      throw new ForbiddenException('Only group admins or owners can update group details');
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (this.chatGateway) {
      this.chatGateway.notifyGroupUpdated(conversationId, {
        type: 'group_updated',
        conversation: updated,
      });
    }

    return updated;
  }

  async getMessages(conversationId: string, userId: string, limit = 30, before?: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const take = Math.min(Math.max(Number(limit) || 30, 1), 100);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messages.reverse();
  }

  async saveMessage(data: {
    conversationId: string;
    senderId: string;
    text: string;
    clientMessageId?: string;
  }) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId: data.senderId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Sender is not a member of this conversation');
    }

    if (data.clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          senderId_clientMessageId: {
            senderId: data.senderId,
            clientMessageId: data.clientMessageId,
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    const trimmedText = (data.text ?? '').trim();
    if (!trimmedText) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        text: trimmedText,
        clientMessageId: data.clientMessageId,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Touch conversation timestamp
    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    return message;
  }
}
