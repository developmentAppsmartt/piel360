import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class BillingPayoutCronService {
  private readonly logger = new Logger(BillingPayoutCronService.name);

  constructor(private readonly billing: BillingService) {}

  /** Día 1 de cada mes a medianoche: dispersa comisiones pendientes vía Wompi. */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async monthlyAlliedDispersion() {
    this.logger.log('Cron mensual: iniciando dispersión de comisiones aliadas');
    try {
      const result = await this.billing.disperseAllPendingCommissions('cron');
      this.logger.log(
        `Cron mensual: procesadas ${result.processed} empresas aliadas`,
      );
    } catch (err) {
      this.logger.error(
        `Cron mensual de dispersión falló: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** Cada hora: reconcilia lotes en processing con el estado en Wompi. */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcilePayouts() {
    try {
      const result = await this.billing.reconcileProcessingPayouts();
      if (result.updated > 0) {
        this.logger.log(`Reconciliación payouts: ${result.updated} lotes`);
      }
    } catch (err) {
      this.logger.warn(
        `Reconciliación payouts: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
