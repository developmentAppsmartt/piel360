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

/** `null` = sin filtro por doctor: el panel de admin ve toda la plataforma.
 * Se resuelve acá y no duplicando las queries para que el filtro de proveedor
 * (con su fallback legacy) tenga una sola definición. */
type DoctorIds = string[] | null;

/** Join + filtro base compartido por las queries: Skiniver válido, del
 * doctor correcto, en el rango de fechas — con fallback a la heurística de
 * task-ids para filas legacy sin `provider_id` (mismo criterio que
 * analysis-image-urls.service.ts / analysis-results-view.tsx). */
function baseJoin(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  const doctorFilter = doctorIds
    ? Prisma.sql`AND p.doctor_id = ANY(${doctorIds}::bigint[])`
    : Prisma.empty;
  return Prisma.sql`
    FROM analyses a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN analysis_providers pr ON pr.id = a.provider_id
    WHERE a.is_valid = TRUE
      ${doctorFilter}
      AND (
        pr.slug = 'skiniver'
        OR (pr.slug IS NULL AND a.youcam_task_id IS NULL AND a.fitzpatrick_task_id IS NULL)
      )
      AND a.created_at >= ${from}
      AND a.created_at <  ${toExclusive}
  `;
}

/**
 * El diagnóstico que cuenta: el del profesional cuando lo dejó al confirmar o
 * corregir (`final_diagnosis_code` no nulo, ver
 * apps/api/src/analyses/final-diagnosis.ts) y, si no, el de la IA. Antes los
 * reportes leían siempre el de la IA, así que una corrección no cambiaba nada.
 * Las cuatro piezas van juntas: mezclar el nombre de uno con la categoría del
 * otro contaría una enfermedad en un grupo que no es el suyo.
 */
const CORRECTED = Prisma.sql`a.final_diagnosis_code IS NOT NULL`;
const DIAGNOSIS = Prisma.sql`(CASE WHEN ${CORRECTED} THEN a.final_diagnosis ELSE a.ai_diagnosis END)`;
export const CATEGORY = Prisma.sql`(CASE WHEN ${CORRECTED} THEN a.final_diagnosis_category ELSE a.ai_raw_response->>'desease' END)`;
export const CLASS_RAW = Prisma.sql`COALESCE(a.final_diagnosis_code, a.ai_raw_response->>'class_raw')`;
/** Mes de Colombia del análisis. `created_at` es UTC sin zona: con el mes
 * UTC, un análisis del 31/10 a las 21:00 caía en noviembre, fuera de los meses
 * del rango, y el gráfico lo descartaba. Colombia no tiene horario de verano. */
const COLOMBIA_MONTH = Prisma.sql`date_trunc('month', a.created_at - interval '5 hours')`;

/** El ICD solo existe para el diagnóstico principal de la IA: con otro
 * diagnóstico sería el código de una enfermedad distinta. */
const ICD_CODE = Prisma.sql`(CASE WHEN ${CORRECTED} THEN NULL ELSE a.ai_raw_response->>'lesion_code' END)`;

/**
 * El universo de los reportes de diagnóstico: un análisis con diagnóstico,
 * «Piel Sin Patología» incluida — el cliente la quiere ver como una clase más.
 * Está en un solo sitio porque las dos queries que lo usan (mensual y top)
 * tienen que contar exactamente las mismas filas: cuando cada una filtraba a
 * su manera, el total salía de un universo y los porcentajes de otro, y
 * pasaban del 100%.
 */
function diagnosedFilter(): Prisma.Sql {
  return Prisma.sql`AND ${DIAGNOSIS} IS NOT NULL`;
}

/** Rangos de ANALISIS_DERMA_PIEL360_AGE_BUCKETS, calculados a la fecha del análisis:
 * `Analysis.chronologicalAgeYears` solo se llena para YouCam. */
function ageBucketCase(): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN age_years <= 12 THEN '0-12'
      WHEN age_years <= 20 THEN '13-20'
      WHEN age_years <= 30 THEN '21-30'
      WHEN age_years <= 40 THEN '31-40'
      WHEN age_years <= 50 THEN '41-50'
      WHEN age_years <= 60 THEN '51-60'
      ELSE '61+'
    END
  `;
}

export interface AnalisisDermaPiel360DiagnosisRow {
  period: string;
  ai_diagnosis: string | null;
  /** Clase (`desease` de la IA o el grupo del profesional). */
  category: string | null;
  /** Id del clasificador (`2A_acne_vulgaris`): la identidad del diagnóstico,
   * que no cambia con el idioma del nombre visible. */
  class_raw: string | null;
  count: number;
}

/**
 * Diagnóstico que cuenta (`DIAGNOSIS`: el del profesional o el de la IA) por
 * mes, con su clase y su id de clasificador. Alimenta el donut de clases y los
 * gráficos mensuales de clase y de enfermedad. Las etiquetas se resuelven en
 * TS (analisisDermaPiel360ClassLabel), no en SQL, para no duplicar esas tablas
 * en dos lenguajes.
 */
export function analisisDermaPiel360MonthlyDiagnosesQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      to_char(${COLOMBIA_MONTH}, 'YYYY-MM') AS period,
      ${DIAGNOSIS}                                          AS ai_diagnosis,
      ${CATEGORY}                                           AS category,
      ${CLASS_RAW}                                          AS class_raw,
      COUNT(*)::int                                         AS count
    ${baseJoin(doctorIds, from, toExclusive)}
      ${diagnosedFilter()}
    GROUP BY 1, 2, 3, 4
  `;
}

export interface AnalisisDermaPiel360AgeRow {
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
export function analisisDermaPiel360AgeMonthlyQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT
        ${COLOMBIA_MONTH} AS month,
        date_part('year', age(a.created_at, p.birth_date))::int AS age_years
      ${baseJoin(doctorIds, from, toExclusive)}
        AND p.birth_date IS NOT NULL
    )
    SELECT
      to_char(month, 'YYYY-MM') AS period,
      ${ageBucketCase()} AS age_bucket,
      COUNT(*)::int AS count
    FROM scoped
    GROUP BY 1, 2
  `;
}

export interface AnalisisDermaPiel360TopDiagnosisRow {
  diagnosis: string;
  icd_code: string | null;
  class_raw: string | null;
  count: number;
}

/** Conteo por diagnóstico puntual; el Top 10 se corta en TS después de unir
 * el mismo diagnóstico escrito en distintos idiomas. El ICD (`lesion_code`)
 * solo existe en la raíz del JSON, nunca en `topn[]`; `MAX` porque un mismo
 * diagnóstico siempre trae el mismo código y el GROUP BY necesita un agregado. */
export function analisisDermaPiel360TopDiagnosesQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      ${DIAGNOSIS}                                AS diagnosis,
      MAX(${ICD_CODE})                            AS icd_code,
      MAX(${CLASS_RAW})                           AS class_raw,
      COUNT(*)::int                               AS count
    ${baseJoin(doctorIds, from, toExclusive)}
      ${diagnosedFilter()}
    GROUP BY 1
    ORDER BY 4 DESC, 1 ASC
  `;
}

export interface AnalisisDermaPiel360AgeGenderRow {
  age_bucket: string;
  gender: string | null;
  count: number;
}

/** Cruce edad × sexo. `patients.gender` es texto libre: se normaliza en TS con
 * normalizeGender() para no repetir esa lista de valores en SQL. */
export function analisisDermaPiel360AgeGenderQuery(
  doctorIds: DoctorIds,
  from: Date,
  toExclusive: Date,
): Prisma.Sql {
  return Prisma.sql`
    WITH scoped AS (
      SELECT
        date_part('year', age(a.created_at, p.birth_date))::int AS age_years,
        p.gender AS gender
      ${baseJoin(doctorIds, from, toExclusive)}
        AND p.birth_date IS NOT NULL
    )
    SELECT
      ${ageBucketCase()} AS age_bucket,
      gender             AS gender,
      COUNT(*)::int      AS count
    FROM scoped
    GROUP BY 1, 2
  `;
}

export interface AnalisisDermaPiel360SkinToneRow {
  fitzpatrick_type: string | null;
  count: number;
}

/** Distribución por fototipo Fitzpatrick del paciente (no depende del mes —
 * el mockup lo pide como total del periodo, no como serie mensual). */
export function analisisDermaPiel360SkinToneQuery(
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
