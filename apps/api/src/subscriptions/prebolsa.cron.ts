import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class PrebolsaCronService {
  private readonly logger = new Logger(PrebolsaCronService.name);
  private running = false;

  constructor(private readonly subscriptions: SubscriptionsService) {}

  /** Cada minuto: si la bolsa ya cubre una prebolsa pagada, la activa. */
  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'America/Bogota' })
  async releasePaidPrebolsa() {
    if (this.running) return;
    this.running = true;
    try {
      const activated = await this.subscriptions.releasePrebolsa();
      if (activated > 0) {
        this.logger.log(`Prebolsa: ${activated} plan(es) pasaron a activo`);
      }
    } catch (err) {
      this.logger.error(
        `Cron de prebolsa falló: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
