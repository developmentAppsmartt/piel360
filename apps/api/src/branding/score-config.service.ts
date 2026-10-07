import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_YOUCAM_SCORE_CONFIG,
  sanitizeYoucamScoreConfig,
  type YoucamScoreConfig,
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

  async getOwn(user: JwtPayload): Promise<YoucamScoreConfig> {
    await this.branding.assertCanManage(user);
    return this.read(BigInt(user.sub));
  }

  async update(user: JwtPayload, body: unknown): Promise<YoucamScoreConfig> {
    await this.branding.assertCanManage(user);
    let config: YoucamScoreConfig;
    try {
      config = sanitizeYoucamScoreConfig(body);
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
  async getEffective(userId: string): Promise<YoucamScoreConfig> {
    const ownerId = await this.branding.resolveOwnerUserId(BigInt(userId));
    if (!ownerId) return DEFAULT_YOUCAM_SCORE_CONFIG;
    return this.read(ownerId);
  }

  private async read(userId: bigint): Promise<YoucamScoreConfig> {
    const row = await this.prisma.accountScoreConfig.findUnique({
      where: { userId },
    });
    if (!row) return DEFAULT_YOUCAM_SCORE_CONFIG;
    try {
      return sanitizeYoucamScoreConfig({ metrics: row.metrics });
    } catch {
      return DEFAULT_YOUCAM_SCORE_CONFIG;
    }
  }
}
