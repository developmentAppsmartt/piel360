-- Módulo de Reportes del panel del doctor (apps/api/src/doctor-reports).
--
-- Dos partes:
--   1) Índices que faltaban y que son el verdadero cuello de botella de
--      cualquier agregación por doctor + rango de fechas. `patients` no tenía
--      NINGÚN índice (ni en doctor_id, base de todo el scoping multi-tenant).
--   2) Dos vistas de aplanado para que las consultas del reporte no repitan
--      el join patients→analyses→analysis_results ni la resolución del score.
--
-- Las vistas NO se declaran en schema.prisma: Prisma 7 requiere
-- `previewFeatures = ["views"]` para el bloque `view`, y activarlo afecta a
-- todo el cliente. Se consumen con $queryRaw y tipos TS escritos a mano
-- (ver doctor-reports.queries.ts). `prisma migrate diff` las reportará como
-- "extra en la base de datos": es esperado y aceptado.
-- Los índices SÍ se declaran con @@index en schema.prisma para que no queden
-- como drift.

-- ── 1. Índices ──────────────────────────────────────────────────────────────

-- Scoping multi-tenant: toda consulta del módulo filtra por patients.doctor_id.
CREATE INDEX IF NOT EXISTS "idx_patients_doctor_id" ON "patients" ("doctor_id");

-- Join analyses→patients acotado por rango de fechas. Cubre además el patrón
-- "últimos análisis de un paciente" que ya usa el resto de la app.
CREATE INDEX IF NOT EXISTS "idx_analyses_patient_id_created_at"
  ON "analyses" ("patient_id", "created_at");

-- Cuando el rango de fechas es más selectivo que el scope (owner de empresa
-- grande), el planner prefiere arrancar por created_at.
CREATE INDEX IF NOT EXISTS "idx_analyses_created_at" ON "analyses" ("created_at");

-- v_skin_metric_scores filtra por analysis_id + type. El índice suelto de
-- `type` (~19 valores distintos) tiene cardinalidad demasiado baja para servir;
-- como sufijo de analysis_id sí es útil.
CREATE INDEX IF NOT EXISTS "idx_analysis_results_analysis_id_type"
  ON "analysis_results" ("analysis_id", "type");

-- ── 2. Vistas ───────────────────────────────────────────────────────────────

-- Un registro por análisis YouCam válido: alimenta los KPIs de conteo,
-- el puntaje global y la edad de piel. Separada de v_skin_metric_scores para
-- que esos KPIs no necesiten DISTINCT sobre las ~30 filas de métricas.
--
-- overall_score sale de la fila `all` (la "Puntuación global" de YouCam),
-- prefiriendo region 'whole' igual que youcamScoresByType() en
-- packages/shared/src/youcam-report.ts.
CREATE OR REPLACE VIEW v_report_analyses AS
SELECT
  a.id                       AS analysis_id,
  a.patient_id,
  p.doctor_id,
  a.created_at,
  a.skin_age_years,
  a.chronological_age_years,
  a.skin_age_difference,
  ov.score                   AS overall_score
FROM analyses a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN LATERAL (
  SELECT COALESCE(r.ui_score, r.score, r.raw_score) AS score
  FROM analysis_results r
  WHERE r.analysis_id = a.id
    AND r.type = 'all'
    AND COALESCE(r.ui_score, r.score, r.raw_score) IS NOT NULL
  ORDER BY (r.region = 'whole') DESC NULLS LAST, r.id
  LIMIT 1
) ov ON TRUE
WHERE a.is_valid = TRUE
  AND a.youcam_task_id IS NOT NULL
  AND p.doctor_id IS NOT NULL;

-- Un registro por (análisis, métrica, región) para las 15 métricas numéricas
-- (YOUCAM_MAIN_METRIC_TYPES). Excluye hd_skin_type (categórica, sin score).
--
-- El COALESCE va acá dentro a propósito: es la definición canónica del score
-- visible (replica resolveScore() de analysis-conditions.service.ts y
-- youcamMetricValue() de packages/shared/src/youcam-report.ts). Tenerla en un
-- solo lugar evita que cada consulta la reimplemente distinta.
--
-- `is_general` marca la fila que representa el puntaje general de la métrica
-- (region 'whole' o sin región). Se expone como booleano plano y NO como
-- ROW_NUMBER() a propósito: con una window function Postgres no puede empujar
-- los filtros de doctor_id/created_at al join, y cada consulta terminaría
-- escaneando analysis_results entero.
CREATE OR REPLACE VIEW v_skin_metric_scores AS
SELECT
  a.id           AS analysis_id,
  a.patient_id,
  p.doctor_id,
  a.created_at,
  r.type,
  r.region,
  COALESCE(r.ui_score, r.score, r.raw_score) AS score,
  (r.region IS NULL OR r.region = 'whole')   AS is_general
FROM analyses a
JOIN patients p ON p.id = a.patient_id
JOIN analysis_results r ON r.analysis_id = a.id
WHERE a.is_valid = TRUE
  AND a.youcam_task_id IS NOT NULL
  AND p.doctor_id IS NOT NULL
  AND COALESCE(r.ui_score, r.score, r.raw_score) IS NOT NULL
  AND r.type IN (
    'hd_wrinkle','hd_age_spot','hd_texture','hd_dark_circle','hd_firmness',
    'hd_pore','hd_droopy_upper_eyelid','hd_droopy_lower_eyelid','hd_acne',
    'hd_radiance','hd_oiliness','hd_moisture','hd_redness','hd_eye_bag','hd_tear_trough'
  );
