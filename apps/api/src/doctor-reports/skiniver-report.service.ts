import { Injectable } from '@nestjs/common';
import {
  SKINIVER_AGE_BUCKETS,
  SKIN_TONE_BUCKET_DEFS,
  classifyDiagnosisClass,
  isNoPathologyDiagnosis,
  normalizeGender,
  skinToneBucketForFitzpatrick,
  skiniverCategoryColor,
  skiniverCategoryLabel,
  skiniverDiagnosisLabel,
  type SkiniverAgeGenderRow,
  type SkiniverCategorySlice,
  type SkiniverMonthlySeriesPoint,
  type SkiniverReport,
  type SkiniverSkinToneBucket,
  type SkiniverTopDiagnosis,
  type SkiniverTrendSeriesDef,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  skiniverAgeGenderQuery,
  skiniverAgeMonthlyQuery,
  skiniverCategoryQuery,
  skiniverMonthlyDiagnosesQuery,
  skiniverSkinToneQuery,
  skiniverTopDiagnosesQuery,
  type SkiniverAgeGenderRow as SkiniverAgeGenderSqlRow,
  type SkiniverAgeRow,
  type SkiniverCategoryRow,
  type SkiniverDiagnosisRow,
  type SkiniverSkinToneRow,
  type SkiniverTopDiagnosisRow,
} from './skiniver-reports.queries';

export interface SkiniverReportRange {
  from: Date;
  to: Date;
  toExclusive: Date;
}

/** Lista de "YYYY-MM" entre `from` y `to` (inclusivos), un mes por entrada, para
 * que las series muestren también los meses sin diagnósticos en vez de saltarlos. */
function monthKeysInRange(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    keys.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

/** Arma la serie mensual con todos los meses del rango y todas las claves de
 * bucket presentes, para que el chart no tenga que rellenar huecos. */
function buildSeries(
  months: string[],
  entries: { period: string; key: string | null; count: number }[],
): SkiniverMonthlySeriesPoint[] {
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
    counts: byPeriod.get(period) ?? ({} as Record<string, number>),
  }));
}

/** Cuántas condiciones se grafican antes de agrupar el resto en "Otras". */
const DISEASE_SERIES_LIMIT = 8;

const OTHER_DISEASE_KEY = 'otras';

/**
 * Las condiciones concretas del periodo, no grupos: cada serie es un
 * diagnóstico real de la IA ("Acné vulgar", "Nevus displásico"). Antes este
 * gráfico usaba 10 buckets curados a mano (Acné, Dermatitis, Tiña…) que
 * también eran grupos, así que repetía el nivel del gráfico de clases y las
 * condiciones nunca se veían — además todos los tumores caían en "Otras".
 *
 * Se limita al Top 8 porque el catálogo tiene 52 diagnósticos y una leyenda de
 * 52 series es ilegible.
 */
function buildDiseaseSeries(rows: SkiniverDiagnosisRow[]): {
  entries: { period: string; key: string | null; count: number }[];
  series: SkiniverTrendSeriesDef[];
} {
  // La etiqueta traducida es la identidad de la serie: dos filas con el mismo
  // diagnóstico en distinto idioma tienen que sumar en la misma serie.
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.ai_diagnosis || isNoPathologyDiagnosis(row.ai_diagnosis)) continue;
    const label = skiniverDiagnosisLabel(row.ai_diagnosis);
    totals.set(label, (totals.get(label) ?? 0) + row.count);
  }

  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, DISEASE_SERIES_LIMIT)
    .map(([label]) => label);
  const topSet = new Set(top);

  const entries = rows.map((row) => {
    if (!row.ai_diagnosis || isNoPathologyDiagnosis(row.ai_diagnosis)) {
      return { period: row.period, key: null, count: row.count };
    }
    const label = skiniverDiagnosisLabel(row.ai_diagnosis);
    return {
      period: row.period,
      key: topSet.has(label) ? label : OTHER_DISEASE_KEY,
      count: row.count,
    };
  });

  const series: SkiniverTrendSeriesDef[] = top.map((label) => ({
    // La clave es la propia etiqueta: el color se deriva de ella por hash, así
    // que una condición conserva su color al cambiar el filtro de fechas
    // (un color por posición en la lista sí cambiaría).
    key: label,
    label,
    color: skiniverCategoryColor(label),
  }));
  if (totals.size > top.length) {
    series.push({
      key: OTHER_DISEASE_KEY,
      label: 'Otras',
      color: '#94a3b8',
    });
  }

  return { entries, series };
}

/**
 * Reporte de análisis dermatológicos (Skiniver). Vive en su propio service
 * porque lo consumen dos paneles con alcances distintos: el del doctor,
 * acotado a `doctorIds`, y el de admin, que pasa `null` para ver toda la
 * plataforma.
 *
 * Skiniver no deja puntajes ni filas en `analysis_results` (solo
 * `ai_diagnosis` + `ai_raw_response`), así que nada de esto puede salir de las
 * vistas `v_report_analyses`/`v_skin_metric_scores`, que además lo excluyen.
 */
@Injectable()
export class SkiniverReportService {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    doctorIds: string[] | null,
    range: SkiniverReportRange,
  ): Promise<SkiniverReport> {
    const { from, to, toExclusive } = range;

    const [diagnosisRows, ageRows, skinToneRows, categoryRows, topRows, ageGenderRows] =
      await Promise.all([
        this.prisma.$queryRaw<SkiniverDiagnosisRow[]>(
          skiniverMonthlyDiagnosesQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<SkiniverAgeRow[]>(
          skiniverAgeMonthlyQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<SkiniverSkinToneRow[]>(
          skiniverSkinToneQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<SkiniverCategoryRow[]>(
          skiniverCategoryQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<SkiniverTopDiagnosisRow[]>(
          skiniverTopDiagnosesQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<SkiniverAgeGenderSqlRow[]>(
          skiniverAgeGenderQuery(doctorIds, from, toExclusive),
        ),
      ]);

    const months = monthKeysInRange(from, to);

    const byClass = buildSeries(
      months,
      diagnosisRows.map((row) => ({
        period: row.period,
        key: classifyDiagnosisClass(row.ai_diagnosis),
        count: row.count,
      })),
    );
    const disease = buildDiseaseSeries(diagnosisRows);
    const byDisease = buildSeries(months, disease.entries);
    const byAge = buildSeries(
      months,
      ageRows.map((row) => ({
        period: row.period,
        key: row.age_bucket,
        count: row.count,
      })),
    );

    // El total del periodo es el de diagnósticos con patología: es el
    // denominador de los porcentajes del donut y del top 10, que comparten
    // ese mismo universo.
    const total = categoryRows.reduce((sum, row) => sum + row.count, 0);

    const byCategory: SkiniverCategorySlice[] = categoryRows
      .filter((row): row is SkiniverCategoryRow & { category: string } =>
        Boolean(row.category),
      )
      .map((row) => ({
        // El color se deriva del valor crudo para que no cambie si mañana se
        // reconoce una categoría más y su etiqueta pasa a estar traducida.
        key: row.category,
        label: skiniverCategoryLabel(row.category),
        color: skiniverCategoryColor(row.category),
        count: row.count,
        pct: pct(row.count, total),
      }));

    const topDiagnoses: SkiniverTopDiagnosis[] = topRows.map((row) => ({
      diagnosis: skiniverDiagnosisLabel(row.diagnosis),
      icdCode: row.icd_code?.trim() || null,
      count: row.count,
      pct: pct(row.count, total),
    }));

    const ageTotals = new Map<string, number>();
    for (const point of byAge) {
      for (const [key, count] of Object.entries(point.counts)) {
        ageTotals.set(key, (ageTotals.get(key) ?? 0) + count);
      }
    }
    const ageTotal = [...ageTotals.values()].reduce((a, b) => a + b, 0);
    const ageDistribution: SkiniverCategorySlice[] = SKINIVER_AGE_BUCKETS.map(
      (bucket) => {
        const count = ageTotals.get(bucket.key) ?? 0;
        return {
          key: bucket.key,
          label: bucket.label,
          color: bucket.color,
          count,
          pct: pct(count, ageTotal),
        };
      },
    );

    const genderByBucket = new Map<
      string,
      { male: number; female: number; unknown: number }
    >(SKINIVER_AGE_BUCKETS.map((b) => [b.key, { male: 0, female: 0, unknown: 0 }]));
    for (const row of ageGenderRows) {
      const bucket = genderByBucket.get(row.age_bucket);
      if (!bucket) continue;
      bucket[normalizeGender(row.gender)] += row.count;
    }
    const byAgeGender: SkiniverAgeGenderRow[] = SKINIVER_AGE_BUCKETS.map(
      (bucket) => ({
        key: bucket.key,
        label: bucket.label,
        ...(genderByBucket.get(bucket.key) ?? {
          male: 0,
          female: 0,
          unknown: 0,
        }),
      }),
    );

    const toneCounts = new Map<string, number>(
      SKIN_TONE_BUCKET_DEFS.map((b) => [b.key, 0]),
    );
    for (const row of skinToneRows) {
      const key = skinToneBucketForFitzpatrick(row.fitzpatrick_type);
      if (!key) continue;
      toneCounts.set(key, (toneCounts.get(key) ?? 0) + row.count);
    }
    const skinToneTotal = [...toneCounts.values()].reduce((a, b) => a + b, 0);
    const bySkinTone: SkiniverSkinToneBucket[] = SKIN_TONE_BUCKET_DEFS.map(
      (def) => {
        const count = toneCounts.get(def.key) ?? 0;
        return {
          key: def.key,
          label: def.label,
          color: def.color,
          count,
          pct: pct(count, skinToneTotal),
        };
      },
    );

    return {
      range: { from: toIsoDate(from), to: toIsoDate(to) },
      total,
      byCategory,
      topDiagnoses,
      byAgeGender,
      ageDistribution,
      byClass,
      byDisease,
      diseaseSeries: disease.series,
      byAge,
      bySkinTone,
      skinToneTotal,
    };
  }
}
