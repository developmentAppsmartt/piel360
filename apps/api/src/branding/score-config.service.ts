import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_ANALISIS_PIEL360_SCORE_CONFIG,
  sanitizeAnalisisPiel360ScoreConfig,
  type AnalisisPiel360ScoreConfig,
} from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/types';
import { BrandingService } from './branding.service';

@Injectable()
export class ScoreConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branding: BrandingService,
  ) {}

  async getOwn(user: JwtPayload): Promise<AnalisisPiel360ScoreConfig> {
    await this.branding.assertCanManage(user);
    return this.read(BigInt(user.sub));
  }

  async update(user: JwtPayload, body: unknown): Promise<AnalisisPiel360ScoreConfig> {
    await this.branding.assertCanManage(user);
    let config: AnalisisPiel360ScoreConfig;
    try {
      config = sanitizeAnalisisPiel360ScoreConfig(body);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Configuración inválida',
      );
    }
    const userId = BigInt(user.sub);
    const data = { metrics: config.metrics as Prisma.InputJsonValue };
    await this.prisma.accountScoreConfig.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return config;
  }

  /** La que aplica al usuario: la suya, la de su empresa o la de su profesional. */
  async getEffective(userId: string): Promise<AnalisisPiel360ScoreConfig> {
    const ownerId = await this.branding.resolveOwnerUserId(BigInt(userId));
    if (!ownerId) return DEFAULT_ANALISIS_PIEL360_SCORE_CONFIG;
    return this.read(ownerId);
  }

  private async read(userId: bigint): Promise<AnalisisPiel360ScoreConfig> {
    const row = await this.prisma.accountScoreConfig.findUnique({
      where: { userId },
    });
    if (!row) return DEFAULT_ANALISIS_PIEL360_SCORE_CONFIG;
    try {
      return sanitizeAnalisisPiel360ScoreConfig({ metrics: row.metrics });
    } catch {
      return DEFAULT_ANALISIS_PIEL360_SCORE_CONFIG;
    }
  }
}
