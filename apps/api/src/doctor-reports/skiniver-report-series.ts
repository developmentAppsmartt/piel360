import {
  analisisDermaPiel360CategoryColor,
  normalizeLabelKey,
  type AnalisisDermaPiel360MonthlySeriesPoint,
  type AnalisisDermaPiel360TrendSeriesDef,
} from '@piel360/shared';

/**
 * Piezas con las que skiniver-report.service.ts arma los gráficos: meses del
 * rango, series mensuales, porcentajes y el Top N con "Otras".
 */

export type SeriesEntry = { period: string; key: string | null; count: number };

/** Lista de "YYYY-MM" entre `from` y `to` (inclusivos), un mes por entrada, para
 * que las series muestren también los meses sin diagnósticos en vez de saltarlos. */
export function monthKeysInRange(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    keys.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

export function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

/** Arma la serie mensual con todos los meses del rango y todas las claves de
 * bucket presentes, para que el chart no tenga que rellenar huecos. */
export function buildSeries(
  months: string[],
  entries: SeriesEntry[],
): AnalisisDermaPiel360MonthlySeriesPoint[] {
  const byPeriod = new Map<string, Record<string, number>>(
    months.map((m) => [m, {}]),
  );
  for (const entry of entries) {
    if (!entry.key) continue;
    const bucket = byPeriod.get(entry.period);
    if (!bucket) continue; // mes fuera del rango (no debería ocurrir)
    bucket[entry.key] = (bucket[entry.key] ?? 0) + entry.count;
  }
  return months.map((period) => ({
    period,
    counts: byPeriod.get(period) ?? {},
  }));
}

/** Suma las filas que comparten etiqueta (sin distinguir tildes ni
 * mayúsculas) y las ordena de mayor a menor. `extra` conserva el primer valor
 * no nulo, p. ej. el CIE-10 de un diagnóstico. */
export function mergeByLabel<T>(
  rows: { label: string; count: number; extra: T | null }[],
): { label: string; count: number; extra: T | null }[] {
  const merged = new Map<
    string,
    { label: string; count: number; extra: T | null }
  >();
  for (const row of rows) {
    const key = normalizeLabelKey(row.label);
    const current = merged.get(key);
    if (current) {
      current.count += row.count;
      current.extra ??= row.extra;
    } else {
      merged.set(key, { ...row });
    }
  }
  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'),
  );
}

/** Cuántas series se grafican antes de agrupar el resto en "Otras": una
 * leyenda de 16 clases o 56 enfermedades es ilegible. */
const TOP_SERIES_LIMIT = 8;

const OTHER_KEY = 'otras';

/**
 * Serie mensual de las `TOP_SERIES_LIMIT` etiquetas más frecuentes del
 * periodo; el resto, y las filas sin etiqueta (`label: null`), van a "Otras"
 * para que la suma siga dando el total.
 */
export function buildTopSeries(
  rows: { period: string; label: string | null; count: number }[],
): { entries: SeriesEntry[]; series: AnalisisDermaPiel360TrendSeriesDef[] } {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.label) continue;
    totals.set(row.label, (totals.get(row.label) ?? 0) + row.count);
  }

  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, TOP_SERIES_LIMIT)
    .map(([label]) => label);
  const topSet = new Set(top);

  const entries = rows.map((row) => ({
    period: row.period,
    key: row.label && topSet.has(row.label) ? row.label : OTHER_KEY,
    count: row.count,
  }));

  const series: AnalisisDermaPiel360TrendSeriesDef[] = top.map((label) => ({
    // La clave es la propia etiqueta: el color se deriva de ella por hash, así
    // que una serie conserva su color al cambiar el filtro de fechas (un color
    // por posición en la lista sí cambiaría).
    key: label,
    label,
    color: analisisDermaPiel360CategoryColor(label),
  }));
  if (entries.some((entry) => entry.key === OTHER_KEY)) {
    series.push({ key: OTHER_KEY, label: 'Otras', color: '#94a3b8' });
  }

  return { entries, series };
}
