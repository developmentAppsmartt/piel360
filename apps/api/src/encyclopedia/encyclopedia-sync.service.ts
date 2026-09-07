import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { ENCYCLOPEDIA_QUEUE, type EncyclopediaJobData } from '../analyses/queues';
import { SkiniverService } from '../skiniver/skiniver.service';

/**
 * Puerto de `SyncEncyclopediaJob` (Laravel, `routes/console.php:12` —
 * `Schedule::job(new SyncEncyclopediaJob)->monthly()`). El encolado
 * reactivo de `AnalysesService` (al crear un análisis Skiniver) solo cubre
 * diagnósticos nuevos — cualquier análisis creado antes de que ese código
 * funcionara bien (o si el encolado falló) se queda sin su artículo para
 * siempre, porque nada lo reintenta. Este sync recorre el catálogo
 * *completo* del atlas de Skiniver (`get_atlas_pages`) y encola el scrape
 * de cada artículo — igual que Laravel, decoupled de cualquier análisis
 * puntual.
 */
@Injectable()
export class EncyclopediaSyncService {
  private readonly logger = new Logger(EncyclopediaSyncService.name);

  constructor(
    private readonly skiniver: SkiniverService,
    @InjectQueue(ENCYCLOPEDIA_QUEUE)
    private readonly encyclopediaQueue: Queue<EncyclopediaJobData>,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async scheduledSync(): Promise<void> {
    await this.syncAllArticles();
  }

  /** Encola el scrape de todo el catálogo — no espera a que los jobs
   * terminen, solo los deja en cola (igual que el dispatch de Laravel). */
  async syncAllArticles(): Promise<{ queued: number }> {
    this.logger.log('Sincronizando atlas: consultando get_atlas_pages...');
    const data = await this.skiniver.getAtlasPages();
    const categories = data.categories ?? [];

    let queued = 0;
    for (const category of categories) {
      for (const article of category.articles ?? []) {
        if (!article.article_url) continue;
        try {
          await this.encyclopediaQueue.add('process', {
            url: article.article_url,
          });
          queued++;
        } catch (error) {
          this.logger.warn(
            `No se pudo encolar ${article.article_url}: ${String(error)}`,
          );
        }
      }
    }

    this.logger.log(`Sincronización de atlas: ${queued} artículos encolados.`);
    return { queued };
  }
}
