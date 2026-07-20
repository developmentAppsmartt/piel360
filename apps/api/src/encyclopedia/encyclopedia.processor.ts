import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  ENCYCLOPEDIA_QUEUE,
  type EncyclopediaJobData,
} from '../analyses/queues';
import { EncyclopediaService } from './encyclopedia.service';

/** `ProcessEncyclopediaUrl` (MIGRACION.md §4.3/§4.4). */
@Processor(ENCYCLOPEDIA_QUEUE)
export class EncyclopediaProcessor extends WorkerHost {
  private readonly logger = new Logger(EncyclopediaProcessor.name);

  constructor(private readonly encyclopedia: EncyclopediaService) {
    super();
  }

  async process(job: Job<EncyclopediaJobData>): Promise<void> {
    try {
      await this.encyclopedia.processUrl(job.data.url);
    } catch (error) {
      this.logger.warn(
        `No se pudo procesar el artículo ${job.data.url}: ${String(error)}`,
      );
    }
  }

  /** Sin este listener, un error de conexión a Redis (ej. Redis caído en
   * local) queda como 'error' sin handler y tumba el proceso entero. */
  @OnWorkerEvent('error')
  onWorkerError(error: Error) {
    this.logger.warn(
      `Worker de ${ENCYCLOPEDIA_QUEUE} reportó un error: ${error.message}`,
    );
  }
}
