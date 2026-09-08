import { Prisma } from '@prisma/client';

/**
 * Consultas agregadas del reporte de salud de la piel.
 *
 * Se hacen con $queryRaw y no con el API de Prisma porque `groupBy` no puede
 * expresar `date_trunc`, `COUNT(DISTINCT)` ni `FILTER` — y agregarlas en Node
 * (como hace hoy admin.service.ts) obligaría a descargar ~30 filas por análisis.
 *
 * Leen las vistas `v_report_analyses` y `v_skin_metric_scores` (creadas en la
 * migración 20260908190000_skin_report_views_and_indexes), que ya resuelven el
 * join patients→analyses→analysis_results, el COALESCE del score y el filtro
 * base de análisis YouCam válidos.
 *
 * Dos convenciones importantes:
 *
 * 1. TODO agregado se castea en SQL (`::int`, `::float8`). Sin el cast,
 *    `COUNT(*)` llega como BigInt y `AVG()` como Decimal, y el polyfill de
 *    apps/api/src/common/bigint-json.polyfill.ts los serializaría como strings.
 *
 * 2. Los periodos actual y anterior son contiguos, así que se escanea UN solo
 *    rango [prevFrom, toExclusive) y se separan con
 *    `FILTER (WHERE created_at >= from)`. Evita duplicar el trabajo.
 */

/** doctorIds viaja como string[] + ::bigint[] para no depender del binder de BigInt. */
type DoctorIds = string[];

export interface SummaryRow {
  analyses_current: number;
  analyses_previous: number;
  patients_current: number;
  patients_previous: number;
  avg_score_current: number | null;
  avg_score_previous: number | null;
  avg_skin_age_current: number | null;
  avg_skin_age_previous: number | null;
  avg_age_diff_current: number | null;
  avg_age_diff_previous: number | null;
  band_excelente: number;
  band_bueno: number;
  band_regular: number;
  band_malo: number;
  band_total: number;
}

/**
 * KPIs del resumen + distribución en bandas, ambos periodos en una pasada.
 * Los cortes 50/70/90 replican SKIN_REPORT_BANDS de packages/shared/src/skin-report.ts.
 */
export function summaryQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
  prevFrom: Date,
): Prisma.Sql {
  return Prisma.sql`
    WITH base AS (
      SELECT patient_id, overall_score, skin_age_years, skin_age_difference,
             (created_at >= ${from}) AS is_current
      FROM v_report_analyses
      WHERE doctor_id = ANY(${doctorIds}::bigint[])
        AND created_at >= ${prevFrom}
        AND created_at <  ${toExclusive}
    )
    SELECT
      COUNT(*) FILTER (WHERE is_current)::int                        AS analyses_current,
      COUNT(*) FILTER (WHERE NOT is_current)::int                    AS analyses_previous,
      COUNT(DISTINCT patient_id) FILTER (WHERE is_current)::int      AS patients_current,
      COUNT(DISTINCT patient_id) FILTER (WHERE NOT is_current)::int  AS patients_previous,
      AVG(overall_score) FILTER (WHERE is_current)::float8           AS avg_score_current,
      AVG(overall_score) FILTER (WHERE NOT is_current)::float8       AS avg_score_previous,
      AVG(skin_age_years) FILTER (WHERE is_current)::float8          AS avg_skin_age_current,
      AVG(skin_age_years) FILTER (WHERE NOT is_current)::float8      AS avg_skin_age_previous,
      AVG(skin_age_difference) FILTER (WHERE is_current)::float8     AS avg_age_diff_current,
      AVG(skin_age_difference) FILTER (WHERE NOT is_current)::float8 AS avg_age_diff_previous,
      COUNT(*) FILTER (WHERE is_current AND overall_score >= 90)::int                        AS band_excelente,
      COUNT(*) FILTER (WHERE is_current AND overall_score >= 70 AND overall_score < 90)::int AS band_bueno,
      COUNT(*) FILTER (WHERE is_current AND overall_score >= 50 AND overall_score < 70)::int AS band_regular,
      COUNT(*) FILTER (WHERE is_current AND overall_score <  50)::int                        AS band_malo,
      COUNT(*) FILTER (WHERE is_current AND overall_score IS NOT NULL)::int                  AS band_total
    FROM base
  `;
}

export interface TrendRow {
  period: string;
  avg_score: number | null;
  analyses: number;
}

/**
 * Evolución mensual del puntaje global. `created_at` es TIMESTAMP(3) sin zona,
 * así que `date_trunc` ya opera en UTC — mismo criterio que periodKey() de
 * admin.service.ts. Los meses sin datos no vienen: los rellena el service.
 */
export function scoreTrendQuery(
  doctorIds: DoctorIds,
  toExclusive: Date,
  trendMonths: number,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS period,
      AVG(overall_score)::float8                          AS avg_score,
      COUNT(*)::int                                       AS analyses
    FROM v_report_analyses
    WHERE doctor_id = ANY(${doctorIds}::bigint[])
      AND created_at >= date_trunc('month', ${toExclusive}::timestamp)
                        - make_interval(months => ${trendMonths}::int - 1)
      AND created_at <  ${toExclusive}
    GROUP BY 1
    ORDER BY 1
  `;
}

export interface CategoryRow {
  type: string;
  region: string | null;
  avg_current: number | null;
  avg_previous: number | null;
  samples_current: number;
  patients_current: number;
  patients_affected: number;
  patients_candidate: number;
}

/**
 * Ranking por categoría. El catálogo entra como dos arrays paralelos vía
 * `unnest`, donde region '' significa "usa la fila general" (`is_general`).
 * Ordenado ascendente: la cabeza son las necesidades prioritarias, la cola las
 * fortalezas.
 */
export function categoryRankingQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
  prevFrom: Date,
  catTypes: string[],
  catRegions: string[],
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT cat.type AS cat_type, cat.region AS cat_region, s.patient_id, s.score,
             (s.created_at >= ${from}) AS is_current
      FROM v_skin_metric_scores s
      JOIN unnest(${catTypes}::text[], ${catRegions}::text[]) AS cat(type, region)
        ON cat.type = s.type
       AND ((cat.region = '' AND s.is_general) OR cat.region = s.region)
      WHERE s.doctor_id = ANY(${doctorIds}::bigint[])
        AND s.created_at >= ${prevFrom}
        AND s.created_at <  ${toExclusive}
    )
    SELECT
      cat_type                                                                   AS type,
      NULLIF(cat_region, '')                                                     AS region,
      AVG(score) FILTER (WHERE is_current)::float8                               AS avg_current,
      AVG(score) FILTER (WHERE NOT is_current)::float8                           AS avg_previous,
      COUNT(*) FILTER (WHERE is_current)::int                                    AS samples_current,
      COUNT(DISTINCT patient_id) FILTER (WHERE is_current)::int                  AS patients_current,
      COUNT(DISTINCT patient_id) FILTER (WHERE is_current AND score < 70)::int   AS patients_affected,
      COUNT(DISTINCT patient_id)
        FILTER (WHERE is_current AND score >= 50 AND score < 70)::int            AS patients_candidate
    FROM scoped
    GROUP BY cat_type, cat_region
    HAVING COUNT(*) FILTER (WHERE is_current) > 0
    ORDER BY avg_current ASC NULLS LAST
  `;
}

export interface CategoryTrendRow {
  type: string;
  region: string | null;
  period: string;
  avg_score: number | null;
}

/**
 * Serie mensual de TODAS las categorías de una sola vez (~20 × N meses), para
 * que el panel de detalle cambie de categoría sin refetch.
 */
export function categoryTrendQuery(
  doctorIds: DoctorIds,
  toExclusive: Date,
  trendMonths: number,
  catTypes: string[],
  catRegions: string[],
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT cat.type AS cat_type, cat.region AS cat_region,
             date_trunc('month', s.created_at) AS month, s.score
      FROM v_skin_metric_scores s
      JOIN unnest(${catTypes}::text[], ${catRegions}::text[]) AS cat(type, region)
        ON cat.type = s.type
       AND ((cat.region = '' AND s.is_general) OR cat.region = s.region)
      WHERE s.doctor_id = ANY(${doctorIds}::bigint[])
        AND s.created_at >= date_trunc('month', ${toExclusive}::timestamp)
                            - make_interval(months => ${trendMonths}::int - 1)
        AND s.created_at <  ${toExclusive}
    )
    SELECT cat_type AS type, NULLIF(cat_region, '') AS region,
           to_char(month, 'YYYY-MM') AS period,
           AVG(score)::float8        AS avg_score
    FROM scoped
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3
  `;
}

export interface DerivedKpiRow {
  patients_current: number;
  patients_previous: number;
  critical_current: number;
  critical_previous: number;
  candidate_current: number;
  candidate_previous: number;
}

/**
 * Pacientes críticos / candidatos a protocolo.
 *
 * Clave: primero se reduce a UN peor puntaje por paciente y periodo
 * (`GROUP BY patient_id, is_current` + `MIN(score)`) y solo después se cuenta.
 * Contar filas de métrica directamente daría porcentajes sin sentido.
 * Las dos clases son mutuamente excluyentes por construcción (<50 vs [50,70)).
 */
export function derivedKpiQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
  prevFrom: Date,
  catTypes: string[],
  catRegions: string[],
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT s.patient_id, s.score, (s.created_at >= ${from}) AS is_current
      FROM v_skin_metric_scores s
      JOIN unnest(${catTypes}::text[], ${catRegions}::text[]) AS cat(type, region)
        ON cat.type = s.type
       AND ((cat.region = '' AND s.is_general) OR cat.region = s.region)
      WHERE s.doctor_id = ANY(${doctorIds}::bigint[])
        AND s.created_at >= ${prevFrom}
        AND s.created_at <  ${toExclusive}
    ),
    -- is_current se agrupa como columna ya materializada del CTE: si se
    -- repitiera la comparación de fecha dentro del GROUP BY, Prisma.sql
    -- generaría un placeholder distinto al del SELECT y Postgres no las
    -- reconocería como la misma expresión ("must appear in the GROUP BY").
    per_patient AS (
      SELECT patient_id, is_current, MIN(score)::float8 AS worst_score
      FROM scoped
      GROUP BY patient_id, is_current
    )
    SELECT
      COUNT(*) FILTER (WHERE is_current)::int                            AS patients_current,
      COUNT(*) FILTER (WHERE NOT is_current)::int                        AS patients_previous,
      COUNT(*) FILTER (WHERE is_current AND worst_score < 50)::int       AS critical_current,
      COUNT(*) FILTER (WHERE NOT is_current AND worst_score < 50)::int   AS critical_previous,
      COUNT(*) FILTER (WHERE is_current
                        AND worst_score >= 50 AND worst_score < 70)::int AS candidate_current,
      COUNT(*) FILTER (WHERE NOT is_current
                        AND worst_score >= 50 AND worst_score < 70)::int AS candidate_previous
    FROM per_patient
  `;
}
