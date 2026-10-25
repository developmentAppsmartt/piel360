import { BadRequestException } from '@nestjs/common';
import { colombiaDateKey, colombiaDayStart } from '@piel360/shared';

export const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TREND_MONTHS = 6;

export interface ReportRange {
  /** 00:00 de Colombia del primer día. */
  from: Date;
  /** 00:00 de Colombia del último día (inclusivo). */
  to: Date;
  /** 00:00 de Colombia del día siguiente al último: el rango es semiabierto. */
  toExclusive: Date;
  /** Inicio del periodo anterior de la misma duración. */
  prevFrom: Date;
  trendMonths: number;
}

/**
 * Rango de un reporte a partir de `from`/`to` (`YYYY-MM-DD`, inclusivos), en
 * días de Colombia. Antes se cortaba en `00:00Z` y «del 10/10 al 10/10» iba
 * del 9/10 a las 19:00 al 10/10 a las 19:00 de Bogotá.
 *
 * Las fechas quedan a las 05:00Z, así que `toIsoDate` y los getters UTC
 * (`monthKeys`, `monthKeysInRange`) siguen dando el día y el mes correctos.
 */
export function resolveReportRange(
  query: { from?: string; to?: string; trendMonths?: number },
  defaultDays: number,
): ReportRange {
  const to = colombiaDayStart(query.to ?? colombiaDateKey(new Date()));
  const from = query.from
    ? colombiaDayStart(query.from)
    : new Date(to.getTime() - (defaultDays - 1) * DAY_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException('Rango de fechas inválido');
  }
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException(
      'La fecha inicial no puede ser posterior a la final',
    );
  }

  const toExclusive = new Date(to.getTime() + DAY_MS);
  const span = toExclusive.getTime() - from.getTime();
  return {
    from,
    to,
    toExclusive,
    prevFrom: new Date(from.getTime() - span),
    trendMonths: query.trendMonths ?? DEFAULT_TREND_MONTHS,
  };
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Lista de "YYYY-MM" de los últimos `months` meses, terminando en el de `end`. */
export function monthKeys(end: Date, months: number): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1),
    );
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return keys;
}
