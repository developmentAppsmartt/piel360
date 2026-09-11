import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'message' | 'analysis_request';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: bigint | string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: BigInt(input.userId),
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listForUser(userId: string, limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.notification.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((row) => this.serialize(row));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId: BigInt(userId), readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id: BigInt(id), userId: BigInt(userId) },
    });
    if (!row) return { ok: true };
    if (row.readAt) return this.serialize(row);
    const updated = await this.prisma.notification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    return this.serialize(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId: BigInt(userId), readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  private serialize(row: {
    id: bigint;
    userId: bigint;
    type: string;
    title: string;
    body: string;
    data: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: row.id.toString(),
      userId: row.userId.toString(),
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
