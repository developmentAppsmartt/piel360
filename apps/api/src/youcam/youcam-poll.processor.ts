import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { YOUCAM_POLL_QUEUE, type YoucamPollJobData } from './queues';
import { YoucamResultsService } from './youcam-results.service';
import { YouCamService } from './youcam.service';

/**
 * Job de respaldo (reemplaza el re-despacho manual con delay fijo de 30s de
 * Laravel, sin tope de reintentos): BullMQ reintenta con backoff exponencial
 * hasta `attempts` veces (fijado al encolar en `YoucamAnalysesService`).
 */
@Processor(YOUCAM_POLL_QUEUE)
export class YoucamPollProcessor extends WorkerHost {
  private readonly logger = new Logger(YoucamPollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youcam: YouCamService,
    private readonly results: YoucamResultsService,
  ) {
    super();
  }

  async process(job: Job<YoucamPollJobData>): Promise<void> {
    const { analysisId, taskId } = job.data;

    const analysis = await this.prisma.analysis.findUniqueOrThrow({
      where: { id: BigInt(analysisId) },
    });
    if (analysis.isValid) return; // ya lo procesó el webhook

    const result = await this.youcam.checkStatus(taskId); // lanza si YouCam reporta 'error'
    if (result === 'processing') {
      throw new Error('YouCam task aún procesando');
    }

    await this.results.applySuccess(analysis.id, result);
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
