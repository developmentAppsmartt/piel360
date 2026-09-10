import { Prisma } from '@prisma/client';

/**
 * Consultas del reporte "Análisis clínico IA" (Skiniver) del panel del
 * doctor. A diferencia de doctor-reports.queries.ts (YouCam), estas NO leen
 * las vistas `v_report_analyses`/`v_skin_metric_scores` — ambas excluyen
 * Skiniver a propósito (`youcam_task_id IS NOT NULL`). Se consulta
 * `analyses`+`patients`+`analysis_providers` directo.
 *
 * `doctor_id` viaja como string[] + ::bigint[], mismo criterio que
 * doctor-reports.queries.ts. Todo agregado se castea (`::int`) para evitar
 * que llegue como BigInt (ver el polyfill de bigint-json).
 */

type DoctorIds = string[];

/** Join + filtro base compartido por las 3 queries: Skiniver válido, del
 * doctor correcto, en el rango de fechas — con fallback a la heurística de
 * task-ids para filas legacy sin `provider_id` (mismo criterio que
 * analysis-image-urls.service.ts / analysis-results-view.tsx). */
function baseJoin(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    FROM analyses a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN analysis_providers pr ON pr.id = a.provider_id
    WHERE a.is_valid = TRUE
      AND p.doctor_id = ANY(${doctorIds}::bigint[])
      AND (
        pr.slug = 'skiniver'
        OR (pr.slug IS NULL AND a.youcam_task_id IS NULL AND a.fitzpatrick_task_id IS NULL)
      )
      AND a.created_at >= ${from}
      AND a.created_at <  ${toExclusive}
  `;
}

export interface SkiniverDiagnosisRow {
  period: string;
  ai_diagnosis: string | null;
  count: number;
}

/**
 * Diagnóstico crudo (`ai_diagnosis`, top-1 de Skiniver) por mes. La
 * clasificación en clase/enfermedad (5 y 10 buckets del mockup) se hace en
 * TS con classifyDiagnosisClass/classifyDiseaseBucket
 * (packages/shared/src/skiniver-diagnosis-taxonomy.ts) — no en SQL, para no
 * duplicar esa tabla de mapeo en dos lenguajes.
 */
export function skiniverMonthlyDiagnosesQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      to_char(date_trunc('month', a.created_at), 'YYYY-MM') AS period,
      a.ai_diagnosis                                        AS ai_diagnosis,
      COUNT(*)::int                                         AS count
    ${baseJoin(doctorIds, from, toExclusive)}
      AND a.ai_diagnosis IS NOT NULL
    GROUP BY 1, 2
  `;
}

export interface SkiniverAgeRow {
  period: string;
  age_bucket: string;
  count: number;
}

/**
 * Distribución por edad y mes. `Analysis.chronologicalAgeYears` solo se
 * calcula para YouCam (ver analyses.service.ts) — acá se calcula la edad al
 * momento del análisis directo en SQL con `age()`, equivalente al
 * `ageInYears()` de analysis-conditions.service.ts.
 */
export function skiniverAgeMonthlyQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT
        date_trunc('month', a.created_at) AS month,
        date_part('year', age(a.created_at, p.birth_date))::int AS age_years
      ${baseJoin(doctorIds, from, toExclusive)}
        AND p.birth_date IS NOT NULL
    )
    SELECT
      to_char(month, 'YYYY-MM') AS period,
      CASE
        WHEN age_years <= 17 THEN '0-17'
        WHEN age_years <= 25 THEN '18-25'
        WHEN age_years <= 35 THEN '26-35'
        WHEN age_years <= 45 THEN '36-45'
        WHEN age_years <= 55 THEN '46-55'
        ELSE '56+'
      END AS age_bucket,
      COUNT(*)::int AS count
    FROM scoped
    GROUP BY 1, 2
  `;
}

export interface SkiniverSkinToneRow {
  fitzpatrick_type: string | null;
  count: number;
}

/** Distribución por fototipo Fitzpatrick del paciente (no depende del mes —
 * el mockup lo pide como total del periodo, no como serie mensual). */
export function skiniverSkinToneQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      p.fitzpatrick_type AS fitzpatrick_type,
      COUNT(*)::int      AS count
    ${baseJoin(doctorIds, from, toExclusive)}
      AND p.fitzpatrick_type IS NOT NULL
    GROUP BY 1
  `;
}
