import { Injectable, Logger } from '@nestjs/common';
import type { YouCamResults } from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { youcamMaskKey } from './mask-key.util';

const YOUCAM_PROVIDER_SLUG = 'youcam';

/**
 * Lógica compartida entre el webhook y el job de polling — "el primero que
 * llegue" (INTEGRACIONES-IA.md §2.1). Ambos caminos llaman a `applySuccess`;
 * idempotente en sus tres pasos para que no importe cuál gane la carrera.
 */
@Injectable()
export class YoucamResultsService {
  private readonly logger = new Logger(YoucamResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async applySuccess(
    analysisId: bigint,
    results: YouCamResults,
  ): Promise<void> {
    const analysis = await this.prisma.analysis.findUniqueOrThrow({
      where: { id: analysisId },
    });
    if (analysis.isValid) return; // ya lo procesó la otra vía

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        isValid: true,
        aiRawResponse: results as unknown as Prisma.InputJsonValue,
      },
    });

    for (const item of results.output ?? []) {
      if (item.mask_urls?.length) {
        await this.downloadMask(
          analysisId,
          youcamMaskKey(item),
          item.mask_urls[0],
        );
      }
    }

    await this.consumeCreditIfNeeded(analysisId);
  }

  private async downloadMask(analysisId: bigint, key: string, url: string) {
    try {
      const buffer = await this.storage.downloadToBuffer(url);
      const ext = url.includes('.png') ? 'png' : 'jpg';
      // Sin extensión en la key (a diferencia de original/colored/masked de
      // Skiniver) — así AnalysesService.withImageUrls puede reconstruirla
      // solo con `type`+`region` (ya disponibles en aiRawResponse.output[])
      // sin depender de guardar la extensión real en DB.
      await this.storage.upload(
        `analyses/${analysisId}/masks/${key}`,
        buffer,
        ext === 'png' ? 'image/png' : 'image/jpeg',
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo descargar la máscara ${key} del análisis ${analysisId}: ${String(error)}`,
      );
    }
  }

  private async consumeCreditIfNeeded(analysisId: bigint) {
    const analysis = await this.prisma.analysis.findUniqueOrThrow({
      where: { id: analysisId },
      include: { usage: true },
    });
    if (analysis.usage) return; // ya consumido por la otra vía
    if (!analysis.userId) return;

    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      analysis.userId,
      YOUCAM_PROVIDER_SLUG,
    );
    if (!subscription) {
      this.logger.warn(
        `Análisis ${analysisId} completado sin suscripción YouCam activa — no se consume crédito`,
      );
      return;
    }

    await this.subscriptions.consumeCredit(
      this.prisma,
      subscription.id,
      analysisId,
    );
  }
}
