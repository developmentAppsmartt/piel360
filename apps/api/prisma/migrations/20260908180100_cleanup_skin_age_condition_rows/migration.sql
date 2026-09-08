-- Salvaguarda: elimina cualquier condición histórica con metric_type = 'skin_age'
-- en RoutineCondition/TreatmentCondition antes de que ese valor deje de ser
-- válido en CONDITIONABLE_METRIC_TYPES (packages/shared/src/constants.ts) —
-- ya reemplazado por el módulo dedicado skin-age-rules. Confirmado 0 filas en
-- local; esta migración protege producción por si hay datos residuales.
DELETE FROM "routine_conditions" WHERE "metric_type" = 'skin_age';
DELETE FROM "treatment_conditions" WHERE "metric_type" = 'skin_age';
