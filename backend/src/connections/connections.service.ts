import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '@prisma/client';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic pair key: sorted min(a,b)_max(a,b) to prevent
   * bi-directional duplicates (Alice→Bob and Bob→Alice).
   */
  generatePairKey(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Standard user select shape to avoid leaking sensitive fields.
   */
  private get userSelect() {
    return {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      bio: true,
    } as const;
  }

  /**
   * Send a connection request (or auto-accept if reciprocal pending exists).
   */
  async sendRequest(currentUserId: string, recipientId: string) {
    // 1. Self-check
    if (currentUserId === recipientId) {
      throw new BadRequestException('Cannot send a connection request to yourself');
    }

    // 2. Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: this.userSelect,
    });
    if (!recipient) {
      throw new NotFoundException('User not found');
    }

    // 3. Check existing record by pairKey
    const pairKey = this.generatePairKey(currentUserId, recipientId);
    const existing = await this.prisma.userConnection.findUnique({
      where: { pairKey },
    });

    if (existing) {
      // Already connected
      if (existing.status === ConnectionStatus.ACCEPTED) {
        throw new BadRequestException('Already connected');
      }

      // Pending — who sent it?
      if (existing.status === ConnectionStatus.PENDING) {
        if (existing.requesterId === currentUserId) {
          throw new BadRequestException('Connection request already sent');
        }
        // Reciprocal request: auto-accept
        const accepted = await this.prisma.userConnection.update({
          where: { id: existing.id },
          data: { status: ConnectionStatus.ACCEPTED },
          include: {
            requester: { select: this.userSelect },
            recipient: { select: this.userSelect },
          },
        });
        return { connection: accepted, autoAccepted: true };
      }

      // REJECTED or CANCELLED — allow re-request by resetting
      const updated = await this.prisma.userConnection.update({
        where: { id: existing.id },
        data: {
          requesterId: currentUserId,
          recipientId: recipientId,
          status: ConnectionStatus.PENDING,
        },
        include: {
          requester: { select: this.userSelect },
          recipient: { select: this.userSelect },
        },
      });
      return { connection: updated, autoAccepted: false };
    }

    // 4. No existing record — create new
    const connection = await this.prisma.userConnection.create({
      data: {
        pairKey,
        requesterId: currentUserId,
        recipientId: recipientId,
        status: ConnectionStatus.PENDING,
      },
      include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
    });
    return { connection, autoAccepted: false };
  }

  /**
   * Accept a pending connection request (only the recipient can accept).
   */
  async acceptRequest(connectionId: string, currentUserId: string) {
    const connection = await this.prisma.userConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }
    if (connection.recipientId !== currentUserId) {
      throw new ForbiddenException('Only the recipient can accept this request');
    }

    const accepted = await this.prisma.userConnection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.ACCEPTED },
      include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
    });
    return accepted;
  }

  /**
   * Reject a pending connection request (only the recipient can reject).
   */
  async rejectRequest(connectionId: string, currentUserId: string) {
    const connection = await this.prisma.userConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }
    if (connection.recipientId !== currentUserId) {
      throw new ForbiddenException('Only the recipient can reject this request');
    }

    const rejected = await this.prisma.userConnection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.REJECTED },
      include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
    });
    return rejected;
  }

  /**
   * Cancel a pending request (requester) or remove an accepted connection (either party).
   */
  async removeConnection(connectionId: string, currentUserId: string) {
    const connection = await this.prisma.userConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Must be a participant
    if (connection.requesterId !== currentUserId && connection.recipientId !== currentUserId) {
      throw new ForbiddenException('Not authorized');
    }

    // If pending, only the requester can cancel
    if (connection.status === ConnectionStatus.PENDING) {
      if (connection.requesterId !== currentUserId) {
        throw new ForbiddenException('Only the requester can cancel a pending request');
      }
      return this.prisma.userConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.CANCELLED },
        include: {
          requester: { select: this.userSelect },
          recipient: { select: this.userSelect },
        },
      });
    }

    // If accepted, either party can disconnect
    if (connection.status === ConnectionStatus.ACCEPTED) {
      return this.prisma.userConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.CANCELLED },
        include: {
          requester: { select: this.userSelect },
          recipient: { select: this.userSelect },
        },
      });
    }

    throw new BadRequestException('Connection is already removed or rejected');
  }

  /**
   * List all accepted connections for the current user.
   */
  async getConnections(currentUserId: string) {
    return this.prisma.userConnection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { requesterId: currentUserId },
          { recipientId: currentUserId },
        ],
      },
      include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * List pending requests received by the current user.
   */
  async getPendingReceived(currentUserId: string) {
    return this.prisma.userConnection.findMany({
      where: {
        recipientId: currentUserId,
        status: ConnectionStatus.PENDING,
      },
         include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List pending requests sent by the current user.
   */
  async getPendingSent(currentUserId: string) {
    return this.prisma.userConnection.findMany({
      where: {
        requesterId: currentUserId,
        status: ConnectionStatus.PENDING,
      },
      include: {
        requester: { select: this.userSelect },
        recipient: { select: this.userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the connection status between two users (for UI indicators).
   */
  async getConnectionStatus(currentUserId: string, targetUserId: string) {
    const pairKey = this.generatePairKey(currentUserId, targetUserId);
    const connection = await this.prisma.userConnection.findUnique({
      where: { pairKey },
    });
    if (!connection) return { status: 'NONE', connectionId: null };
    return {
      status: connection.status,
      connectionId: connection.id,
      isRequester: connection.requesterId === currentUserId,
    };
  }
}
