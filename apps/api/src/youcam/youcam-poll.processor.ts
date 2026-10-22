import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { YOUCAM_POLL_QUEUE, type AnalisisPiel360PollJobData } from './queues';
import { AnalisisPiel360ResultsService } from './youcam-results.service';
import { AnalisisPiel360Service } from './youcam.service';

/**
 * Job de respaldo (reemplaza el re-despacho manual con delay fijo de 30s de
 * Laravel, sin tope de reintentos): BullMQ reintenta con backoff exponencial
 * hasta `attempts` veces (fijado al encolar en `AnalisisPiel360AnalysesService`).
 */
@Processor(YOUCAM_POLL_QUEUE)
export class AnalisisPiel360PollProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalisisPiel360PollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youcam: AnalisisPiel360Service,
    private readonly results: AnalisisPiel360ResultsService,
  ) {
    super();
  }

  async process(job: Job<AnalisisPiel360PollJobData>): Promise<void> {
    const { analysisId, taskId } = job.data;

    const analysis = await this.prisma.analysis.findUniqueOrThrow({
      where: { id: BigInt(analysisId) },
    });
    if (analysis.isValid) return; // ya lo procesó el webhook

    const result = await this.youcam.checkStatus(taskId);

    if (result.status === 'processing') {
      throw new Error('YouCam task aún procesando'); // BullMQ reintenta (attempts/backoff en AnalisisPiel360AnalysesService)
    }
    if (result.status === 'error') {
      // Condición permanente (ej. resolución de imagen insuficiente) — no
      // tiene sentido reintentar, se marca el análisis y el job termina bien.
      await this.results.applyError(analysis.id, result.message);
      return;
    }

    await this.results.applySuccess(analysis.id, result.results);
  }

  /** Sin este listener, un error de conexión a Redis (ej. Redis caído en
   * local) queda como 'error' sin handler y tumba el proceso entero. */
  @OnWorkerEvent('error')
  onWorkerError(error: Error) {
    this.logger.warn(
      `Worker de ${YOUCAM_POLL_QUEUE} reportó un error: ${error.message}`,
    );
  }
}
