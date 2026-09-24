import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FxRatesService } from './fx-rates.service';

@Injectable()
export class FxRatesCronService {
  private readonly logger = new Logger(FxRatesCronService.name);

  constructor(private readonly fxRates: FxRatesService) {}

  /** 06:00 America/Bogota — actualiza USD/EUR desde dolarapi.com */
  @Cron('0 6 * * *', { timeZone: 'America/Bogota' })
  async refreshFxAtSixAmColombia() {
    this.logger.log('Cron 06:00 Bogotá: actualizando TRM USD/EUR');
    try {
      const result = await this.fxRates.refreshFromDolarApi();
      this.logger.log(
        `Cron TRM OK: USD ${result.usdMarket} · EUR ${result.eurMarket}`,
      );
    } catch (err) {
      this.logger.error(
        `Cron TRM falló: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
