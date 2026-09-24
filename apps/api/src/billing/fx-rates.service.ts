import { Injectable, Logger } from '@nestjs/common';
import {
  BILLING_CONFIG_KEYS,
  pickHighestCotizacion,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';

const DOLAR_API_BASE = 'https://co.dolarapi.com/v1/cotizaciones';

type DolarApiCotizacion = {
  moneda: string;
  nombre: string;
  compra: number;
  venta: number;
  ultimoCierre: number;
  fechaActualizacion: string;
};

export type FxRefreshResult = {
  usdMarket: number;
  eurMarket: number;
  usdSource: DolarApiCotizacion;
  eurSource: DolarApiCotizacion;
  updatedAt: string;
};

@Injectable()
export class FxRatesService {
  private readonly logger = new Logger(FxRatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async fetchCotizacion(code: 'usd' | 'eur'): Promise<DolarApiCotizacion> {
    const res = await fetch(`${DOLAR_API_BASE}/${code}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(
        `dolarapi ${code.toUpperCase()} respondió ${res.status}`,
      );
    }
    const data = (await res.json()) as DolarApiCotizacion;
    if (
      !Number.isFinite(data.compra) ||
      !Number.isFinite(data.venta) ||
      !Number.isFinite(data.ultimoCierre)
    ) {
      throw new Error(`dolarapi ${code.toUpperCase()}: payload inválido`);
    }
    return data;
  }

  /** Descarga USD/EUR, toma el máx. de compra/venta/cierre y persiste en AppConfig. */
  async refreshFromDolarApi(): Promise<FxRefreshResult> {
    const [usdSource, eurSource] = await Promise.all([
      this.fetchCotizacion('usd'),
      this.fetchCotizacion('eur'),
    ]);

    const usdMarket = pickHighestCotizacion(usdSource);
    const eurMarket = pickHighestCotizacion(eurSource);
    const updatedAt = new Date().toISOString();

    await Promise.all([
      this.prisma.appConfig.upsert({
        where: { key: BILLING_CONFIG_KEYS.usdToCop },
        create: { key: BILLING_CONFIG_KEYS.usdToCop, value: String(usdMarket) },
        update: { value: String(usdMarket) },
      }),
      this.prisma.appConfig.upsert({
        where: { key: BILLING_CONFIG_KEYS.eurToCop },
        create: { key: BILLING_CONFIG_KEYS.eurToCop, value: String(eurMarket) },
        update: { value: String(eurMarket) },
      }),
      this.prisma.appConfig.upsert({
        where: { key: BILLING_CONFIG_KEYS.fxRatesUpdatedAt },
        create: {
          key: BILLING_CONFIG_KEYS.fxRatesUpdatedAt,
          value: updatedAt,
        },
        update: { value: updatedAt },
      }),
    ]);

    await this.ensureBalanceKeys();

    this.logger.log(
      `TRM actualizada desde dolarapi: USD ${usdMarket} · EUR ${eurMarket}`,
    );

    return { usdMarket, eurMarket, usdSource, eurSource, updatedAt };
  }

  private async ensureBalanceKeys() {
    for (const key of [
      BILLING_CONFIG_KEYS.usdToCopBalance,
      BILLING_CONFIG_KEYS.eurToCopBalance,
    ] as const) {
      const existing = await this.prisma.appConfig.findUnique({ where: { key } });
      if (!existing) {
        await this.prisma.appConfig.create({
          data: { key, value: '0' },
        });
      }
    }
  }
}
