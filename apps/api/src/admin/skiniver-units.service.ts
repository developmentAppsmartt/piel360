import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPoolService } from '../subscriptions/subscription-pool.service';
import type { CreateSkiniverRechargeDto } from './dto/create-skiniver-recharge.dto';

const SKINIVER_PROVIDER = 'skiniver';
const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SkiniverUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
  ) {}

  async getDermUnitPool() {
    await this.subscriptionPool.syncActiveSubscriptionPools();

    const [recharges, history, committed, skiniverProvider] = await Promise.all([
      this.prisma.platformUnitRecharge.findMany({
        where: { provider: SKINIVER_PROVIDER },
        select: {
          quantity: true,
          expiresAt: true,
        },
      }),
      this.prisma.platformUnitRecharge.findMany({
        where: { provider: SKINIVER_PROVIDER, quantity: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.subscriptionPool.getCommittedCredits(this.prisma, 'skiniver'),
      this.prisma.analysisProvider.findUnique({
        where: { slug: SKINIVER_PROVIDER },
        select: { id: true },
      }),
    ]);

    const now = Date.now();
    const activeTotal = recharges
      .filter((r) => !r.expiresAt || r.expiresAt.getTime() > now)
      .filter((r) => r.quantity > 0)
      .reduce((sum, r) => sum + r.quantity, 0);

    const totalPurchased = recharges
      .filter((r) => r.quantity > 0)
      .reduce((sum, r) => sum + r.quantity, 0);
    const available = Math.max(0, activeTotal - committed);
    const expiringSoon = recharges
      .filter(
        (r) =>
          r.expiresAt &&
          r.expiresAt.getTime() > now &&
          r.expiresAt.getTime() - now <= EXPIRING_SOON_MS,
      )
      .reduce((sum, r) => sum + r.quantity, 0);

    return {
      source: 'skiniver' as const,
      fetchedAt: new Date().toISOString(),
      providerConfigured: Boolean(skiniverProvider),
      pool: {
        id: 'derm' as const,
        name: 'Análisis dermatológico (créditos)',
        accent: 'derm' as const,
        available,
        total: totalPurchased,
        used: committed,
        reserved: committed,
        expiringSoon,
        unitLabel: 'créditos' as const,
      },
      history: history.map((r) => ({
        id: r.id.toString(),
        quantity: r.quantity,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        addedBy: r.createdBy
          ? `${r.createdBy.firstName} ${r.createdBy.lastName}`.trim() ||
            r.createdBy.email
          : 'Super Admin',
        addedByEmail: r.createdBy?.email ?? null,
      })),
    };
  }

  async createRecharge(dto: CreateSkiniverRechargeDto, createdById: bigint) {
    const expiresAt =
      dto.expiresAt?.trim() ? new Date(dto.expiresAt) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Fecha de vencimiento inválida');
    }

    const row = await this.prisma.platformUnitRecharge.create({
      data: {
        provider: SKINIVER_PROVIDER,
        quantity: dto.quantity,
        expiresAt,
        note: dto.note?.trim() || null,
        createdById,
      },
      include: {
        createdBy: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      id: row.id.toString(),
      quantity: row.quantity,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      addedBy: row.createdBy
        ? `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim() ||
          row.createdBy.email
        : 'Super Admin',
    };
  }
}
