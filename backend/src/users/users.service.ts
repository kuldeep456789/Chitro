import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(query: string, currentUserId: string) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isVerified: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
      take: 20,
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName ? { displayName: data.displayName.trim() } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });
  }
}
