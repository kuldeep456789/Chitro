import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, number>(); // userId -> active socket count

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers['authorization'] as string)?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Rejected unauthenticated socket connection: ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'chitro-super-secret-access-token-key-2026',
      );
      const payload = this.jwtService.verify(token as string, { secret });

      client.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
      };

      const currentCount = this.onlineUsers.get(client.user.id) || 0;
      this.onlineUsers.set(client.user.id, currentCount + 1);

      // Join client to their personal user room for direct push notifications
      client.join(`user:${client.user.id}`);

      this.logger.log(`Client connected: ${client.user.username} (${client.id})`);

      // Broadcast presence
      this.server.emit('presence:updated', {
        userId: client.user.id,
        isOnline: true,
      });
    } catch (err: any) {
      this.logger.warn(`Socket auth error: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const currentCount = this.onlineUsers.get(client.user.id) || 1;
      if (currentCount <= 1) {
        this.onlineUsers.delete(client.user.id);
        this.server.emit('presence:updated', {
          userId: client.user.id,
          isOnline: false,
        });
      } else {
        this.onlineUsers.set(client.user.id, currentCount - 1);
      }
      this.logger.log(`Client disconnected: ${client.user.username} (${client.id})`);
    }
  }

  @SubscribeMessage('conversation:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return { success: false, error: 'Unauthorized' };

    const { conversationId } = data;
    // Authorize against database membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: client.user.id,
        },
      },
    });

    if (!member) {
      this.logger.warn(
        `User ${client.user.username} attempted unauthorized subscribe to ${conversationId}`,
      );
      return { success: false, error: 'Forbidden' };
    }

    const room = `conversation:${conversationId}`;
    client.join(room);
    this.logger.log(`User ${client.user.username} subscribed to room ${room}`);
    return { success: true, conversationId };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      text: string;
      clientMessageId?: string;
    },
  ) {
    this.logger.log(`Received message:send from ${client.user?.username} for conv ${data?.conversationId}`);
    if (!client.user) return { success: false, error: 'Unauthorized' };

    const text = (data?.text || '').trim();
    if (!text) {
      return { success: false, error: 'Message text cannot be empty' };
    }

    try {
      // 1. Persist to Neon PostgreSQL first (checking membership & idempotency)
      const persistedMessage = await this.conversationsService.saveMessage({
        conversationId: data.conversationId,
        senderId: client.user.id,
        text,
        clientMessageId: data.clientMessageId,
      });

      // 2. Broadcast canonical persisted message to room
      const room = `conversation:${data.conversationId}`;
      this.server.to(room).emit('message:new', persistedMessage);
      this.logger.log(`Broadcasted message:new to room ${room}`);

      // 3. Acknowledge back to sender
      return { success: true, message: persistedMessage };
    } catch (err: any) {
      this.logger.error(`Error in message:send: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client.to(`conversation:${data.conversationId}`).emit('typing:updated', {
      conversationId: data.conversationId,
      userId: client.user.id,
      username: client.user.username,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client.to(`conversation:${data.conversationId}`).emit('typing:updated', {
      conversationId: data.conversationId,
      userId: client.user.id,
      username: client.user.username,
      isTyping: false,
    });
  }

  @SubscribeMessage('conversation:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    const room = `conversation:${data.conversationId}`;
    client.leave(room);
    this.logger.log(`User ${client.user.username} unsubscribed from room ${room}`);
    return { success: true };
  }

  @SubscribeMessage('conversation:read')
  async handleConversationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId?: string },
  ) {
    if (!client.user || !data?.conversationId) return { success: false };
    try {
      await this.conversationsService.markAsRead(data.conversationId, client.user.id, data.messageId);
      return { success: true };
    } catch (err: any) {
      this.logger.warn(`Error handling conversation:read: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // WebRTC Call Signaling (Phase 13)
  // ==========================================

  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      targetUserId: string;
      callType: 'audio' | 'video';
    },
  ) {
    if (!client.user) return { success: false, error: 'Unauthorized' };
    this.logger.log(`Call initiated from ${client.user.username} to user ${data.targetUserId} (${data.callType})`);
    this.server.to(`user:${data.targetUserId}`).emit('call:incoming', {
      conversationId: data.conversationId,
      callerId: client.user.id,
      callerUsername: client.user.username,
      callType: data.callType,
    });
    return { success: true };
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      targetUserId: string;
      signal: any;
    },
  ) {
    if (!client.user) return { success: false, error: 'Unauthorized' };
    this.server.to(`user:${data.targetUserId}`).emit('call:signal', {
      conversationId: data.conversationId,
      senderId: client.user.id,
      signal: data.signal,
    });
    return { success: true };
  }

  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; callerId: string },
  ) {
    if (!client.user) return { success: false };
    this.server.to(`user:${data.callerId}`).emit('call:accepted', {
      conversationId: data.conversationId,
      recipientId: client.user.id,
    });
    return { success: true };
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; callerId: string; reason?: string },
  ) {
    if (!client.user) return { success: false };
    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      conversationId: data.conversationId,
      recipientId: client.user.id,
      reason: data.reason || 'declined',
    });
    return { success: true };
  }

  @SubscribeMessage('call:hangup')
  handleCallHangup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; targetUserId: string },
  ) {
    if (!client.user) return { success: false };
    this.server.to(`user:${data.targetUserId}`).emit('call:ended', {
      conversationId: data.conversationId,
      endedBy: client.user.id,
    });
    return { success: true };
  }

  // ==========================================
  // Notifications & Broadcasts
  // ==========================================

  notifyConversationRead(conversationId: string, userId: string, readAt: Date, lastReadMessageId?: string) {
    if (!this.server) return;
    this.server.to(`conversation:${conversationId}`).emit('conversation:read', {
      conversationId,
      userId,
      readAt: readAt.toISOString(),
      lastReadMessageId,
    });
  }

  notifyConversationCreated(memberIds: string[], conversation: any) {
    if (!this.server) return;
    for (const memberId of memberIds) {
      this.server.to(`user:${memberId}`).emit('conversation:new', conversation);
    }
  }

  notifyGroupUpdated(conversationId: string, payload: any) {
    if (!this.server) return;
    this.server.to(`conversation:${conversationId}`).emit('group:updated', payload);
  }

  evictUserFromRoom(userId: string, conversationId: string) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('conversation:evicted', { conversationId });
  }

  /**
   * Notify a user that they received a new connection request.
   */
  notifyConnectionRequest(recipientId: string, connection: any) {
    if (!this.server) return;
    this.server.to(`user:${recipientId}`).emit('connection:new_request', connection);
  }

  /**
   * Notify both users that a connection was accepted.
   */
  notifyConnectionAccepted(requesterId: string, recipientId: string, connection: any) {
    if (!this.server) return;
    this.server.to(`user:${requesterId}`).emit('connection:accepted', connection);
    this.server.to(`user:${recipientId}`).emit('connection:accepted', connection);
  }

  /**
   * Notify a user that a connection was removed.
   */
  notifyConnectionRemoved(userId: string, connectionId: string) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('connection:removed', { connectionId });
  }
}
