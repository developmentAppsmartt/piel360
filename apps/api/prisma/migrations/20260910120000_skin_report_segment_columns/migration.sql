-- Reportes segmentados del panel del doctor (tipo de nacimiento, mascota y
-- actividad física) — apps/api/src/doctor-reports.
--
-- Ambas vistas de 20260908190000_skin_report_views_and_indexes ya hacen el
-- join analyses→patients; solo faltaba exponer las columnas demográficas de
-- `patients` que necesitan las nuevas consultas de segmentación. Se agregan
-- al final del SELECT de cada vista (CREATE OR REPLACE VIEW no permite
-- reordenar ni quitar columnas, solo añadir al final), así que no rompe las
-- interfaces TS existentes en doctor-reports.queries.ts (las columnas nuevas
-- simplemente no aparecen ahí).

CREATE OR REPLACE VIEW v_report_analyses AS
SELECT
  a.id                       AS analysis_id,
  a.patient_id,
  p.doctor_id,
  a.created_at,
  a.skin_age_years,
  a.chronological_age_years,
  a.skin_age_difference,
  ov.score                   AS overall_score,
  p.birth_type               AS birth_type,
  p.mascot_type               AS mascot_type,
  p.exercise_habit           AS exercise_habit
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

CREATE OR REPLACE VIEW v_skin_metric_scores AS
SELECT
  a.id           AS analysis_id,
  a.patient_id,
  p.doctor_id,
  a.created_at,
  r.type,
  r.region,
  COALESCE(r.ui_score, r.score, r.raw_score) AS score,
  (r.region IS NULL OR r.region = 'whole')   AS is_general,
  p.birth_type                                AS birth_type,
  p.mascot_type                               AS mascot_type,
  p.exercise_habit                            AS exercise_habit
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
