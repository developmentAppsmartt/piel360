import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ANALYSIS_IMAGES_QUEUE, type AnalysisImagesJobData } from './queues';

/**
 * Descarga colored_s3_url/masked_s3_url de Skiniver (URLs temporales que
 * expiran, MIGRACION.md §4.1 paso 6) y las copia al bucket propio.
 */
@Processor(ANALYSIS_IMAGES_QUEUE)
export class AnalysisImagesProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisImagesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<AnalysisImagesJobData>): Promise<void> {
    const { analysisId, coloredUrl, maskedUrl } = job.data;

    const updates: { coloredS3Url?: string; maskedS3Url?: string } = {};

    if (coloredUrl) {
      try {
        updates.coloredS3Url = await this.copyToOwnBucket(
          analysisId,
          'colored',
          coloredUrl,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo copiar la imagen colored del análisis ${analysisId}: ${String(error)}`,
        );
      }
    }
    if (maskedUrl) {
      try {
        updates.maskedS3Url = await this.copyToOwnBucket(
          analysisId,
          'masked',
          maskedUrl,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo copiar la imagen masked del análisis ${analysisId}: ${String(error)}`,
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.analysis.update({
        where: { id: BigInt(analysisId) },
        data: updates,
      });
    }
  }

  /** Sin este listener, un error de conexión a Redis (ej. Redis caído en
   * local) queda como 'error' sin handler y tumba el proceso entero. */
  @OnWorkerEvent('error')
  onWorkerError(error: Error) {
    this.logger.warn(
      `Worker de ${ANALYSIS_IMAGES_QUEUE} reportó un error: ${error.message}`,
    );
  }

  private async copyToOwnBucket(
    analysisId: string,
    type: 'colored' | 'masked',
    temporaryUrl: string,
  ): Promise<string> {
    const buffer = await this.storage.downloadToBuffer(temporaryUrl);
    const key = `analyses/${analysisId}/${type}.jpg`;
    await this.storage.upload(key, buffer, 'image/jpeg');
    return key;
  }
}
