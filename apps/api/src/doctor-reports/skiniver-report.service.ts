import { Injectable } from '@nestjs/common';
import {
  ANALISIS_DERMA_PIEL360_AGE_BUCKETS,
  SKIN_TONE_BUCKET_DEFS,
  isAnalisisDermaPiel360CategoryName,
  isAnalisisDermaPiel360DiagnosisName,
  normalizeGender,
  normalizeLabelKey,
  skinToneBucketForFitzpatrick,
  analisisDermaPiel360CategoryColor,
  analisisDermaPiel360ClassLabel,
  analisisDermaPiel360DiagnosisLabel,
  type AnalisisDermaPiel360AgeGenderRow,
  type AnalisisDermaPiel360CategorySlice,
  type AnalisisDermaPiel360Report,
  type AnalisisDermaPiel360SkinToneBucket,
  type AnalisisDermaPiel360TopDiagnosis,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSeries,
  buildTopSeries,
  mergeByLabel,
  monthKeysInRange,
  pct,
} from './skiniver-report-series';
import {
  analisisDermaPiel360AgeGenderQuery,
  analisisDermaPiel360AgeMonthlyQuery,
  analisisDermaPiel360MonthlyDiagnosesQuery,
  analisisDermaPiel360SkinToneQuery,
  analisisDermaPiel360TopDiagnosesQuery,
  type AnalisisDermaPiel360AgeGenderRow as AnalisisDermaPiel360AgeGenderSqlRow,
  type AnalisisDermaPiel360AgeRow,
  type AnalisisDermaPiel360DiagnosisRow,
  type AnalisisDermaPiel360SkinToneRow,
  type AnalisisDermaPiel360TopDiagnosisRow,
} from './skiniver-reports.queries';

export interface AnalisisDermaPiel360ReportRange {
  from: Date;
  to: Date;
  toExclusive: Date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const TOP_DIAGNOSES_LIMIT = 10;

/** Etiqueta del donut para una fila que no trae clase ni un código conocido. */
const NO_CLASS_LABEL = 'Sin clase';

/**
 * La clase de la fila, con el nombre oficial (`desease`). Ojo con el JSON de
 * la IA: `desease` es la clase y `class` es la enfermedad.
 */
function classLabel(row: AnalisisDermaPiel360DiagnosisRow): string | null {
  return analisisDermaPiel360ClassLabel(row.category, row.class_raw);
}

/**
 * La enfermedad de la fila, o `null` si el nombre es en realidad una clase.
 *
 * `class_raw` manda: es el id del clasificador, así que el mismo diagnóstico
 * en dos idiomas colapsa en una sola serie en vez de aparecer dos veces. Se
 * pregunta primero por el diagnóstico porque "Dermatitis" y "Piel Sin
 * Patología" son las dos cosas a la vez. Un nombre que no es ni lo uno ni lo
 * otro se grafica tal cual: suele ser un diagnóstico nuevo del modelo.
 */
function diseaseLabel(row: AnalisisDermaPiel360DiagnosisRow): string | null {
  if (!row.ai_diagnosis) return null;
  if (
    !isAnalisisDermaPiel360DiagnosisName(row.ai_diagnosis, row.class_raw) &&
    isAnalisisDermaPiel360CategoryName(row.ai_diagnosis)
  ) {
    return null;
  }
  return analisisDermaPiel360DiagnosisLabel(row.ai_diagnosis, row.class_raw);
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
export class AnalisisDermaPiel360ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    doctorIds: string[] | null,
    range: AnalisisDermaPiel360ReportRange,
  ): Promise<AnalisisDermaPiel360Report> {
    const { from, to, toExclusive } = range;

    const [diagnosisRows, ageRows, skinToneRows, topRows, ageGenderRows] =
      await Promise.all([
        this.prisma.$queryRaw<AnalisisDermaPiel360DiagnosisRow[]>(
          analisisDermaPiel360MonthlyDiagnosesQuery(
            doctorIds,
            from,
            toExclusive,
          ),
        ),
        this.prisma.$queryRaw<AnalisisDermaPiel360AgeRow[]>(
          analisisDermaPiel360AgeMonthlyQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<AnalisisDermaPiel360SkinToneRow[]>(
          analisisDermaPiel360SkinToneQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<AnalisisDermaPiel360TopDiagnosisRow[]>(
          analisisDermaPiel360TopDiagnosesQuery(doctorIds, from, toExclusive),
        ),
        this.prisma.$queryRaw<AnalisisDermaPiel360AgeGenderSqlRow[]>(
          analisisDermaPiel360AgeGenderQuery(doctorIds, from, toExclusive),
        ),
      ]);

    const months = monthKeysInRange(from, to);

    const classes = buildTopSeries(
      diagnosisRows.map((row) => ({
        period: row.period,
        label: classLabel(row),
        count: row.count,
      })),
    );
    const byClass = buildSeries(months, classes.entries);
    const disease = buildTopSeries(
      diagnosisRows.map((row) => ({
        period: row.period,
        label: diseaseLabel(row),
        count: row.count,
      })),
    );
    const byDisease = buildSeries(months, disease.entries);
    const byAge = buildSeries(
      months,
      ageRows.map((row) => ({
        period: row.period,
        key: row.age_bucket,
        count: row.count,
      })),
    );

    // Las mismas filas que las series mensuales, así el donut suma el total.
    // Se agrupa por la etiqueta traducida: la IA escribe la misma clase en
    // varios idiomas ("Cancer" y "Cáncer").
    const classTotals = mergeByLabel(
      diagnosisRows.map((row) => ({
        label: classLabel(row) ?? NO_CLASS_LABEL,
        count: row.count,
        extra: null,
      })),
    );
    const total = classTotals.reduce((sum, row) => sum + row.count, 0);
    const byCategory: AnalisisDermaPiel360CategorySlice[] = classTotals.map(
      (row) => ({
        key: normalizeLabelKey(row.label),
        label: row.label,
        color: analisisDermaPiel360CategoryColor(row.label),
        count: row.count,
        pct: pct(row.count, total),
      }),
    );

    const diagnoses = mergeByLabel(
      topRows.map((row) => ({
        label: analisisDermaPiel360DiagnosisLabel(row.diagnosis, row.class_raw),
        count: row.count,
        extra: row.icd_code?.trim() || null,
      })),
    );

    const topDiagnoses: AnalisisDermaPiel360TopDiagnosis[] = diagnoses
      .slice(0, TOP_DIAGNOSES_LIMIT)
      .map((row) => ({
        diagnosis: row.label,
        icdCode: row.extra,
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
    const ageDistribution: AnalisisDermaPiel360CategorySlice[] =
      ANALISIS_DERMA_PIEL360_AGE_BUCKETS.map((bucket) => {
        const count = ageTotals.get(bucket.key) ?? 0;
        return {
          key: bucket.key,
          label: bucket.label,
          color: bucket.color,
          count,
          pct: pct(count, ageTotal),
        };
      });

    const genderByBucket = new Map<
      string,
      { male: number; female: number; unknown: number }
    >(
      ANALISIS_DERMA_PIEL360_AGE_BUCKETS.map((b) => [
        b.key,
        { male: 0, female: 0, unknown: 0 },
      ]),
    );
    for (const row of ageGenderRows) {
      const bucket = genderByBucket.get(row.age_bucket);
      if (!bucket) continue;
      bucket[normalizeGender(row.gender)] += row.count;
    }
    const byAgeGender: AnalisisDermaPiel360AgeGenderRow[] =
      ANALISIS_DERMA_PIEL360_AGE_BUCKETS.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        ...(genderByBucket.get(bucket.key) ?? {
          male: 0,
          female: 0,
          unknown: 0,
        }),
      }));

    const toneCounts = new Map<string, number>(
      SKIN_TONE_BUCKET_DEFS.map((b) => [b.key, 0]),
    );
    for (const row of skinToneRows) {
      const key = skinToneBucketForFitzpatrick(row.fitzpatrick_type);
      if (!key) continue;
      toneCounts.set(key, (toneCounts.get(key) ?? 0) + row.count);
    }
    const skinToneTotal = [...toneCounts.values()].reduce((a, b) => a + b, 0);
    const bySkinTone: AnalisisDermaPiel360SkinToneBucket[] =
      SKIN_TONE_BUCKET_DEFS.map((def) => {
        const count = toneCounts.get(def.key) ?? 0;
        return {
          key: def.key,
          label: def.label,
          color: def.color,
          count,
          pct: pct(count, skinToneTotal),
        };
      });

    return {
      range: { from: toIsoDate(from), to: toIsoDate(to) },
      total,
      byCategory,
      topDiagnoses,
      byAgeGender,
      ageDistribution,
      byClass,
      classSeries: classes.series,
      byDisease,
      diseaseSeries: disease.series,
      byAge,
      bySkinTone,
      skinToneTotal,
    };
  }
}
