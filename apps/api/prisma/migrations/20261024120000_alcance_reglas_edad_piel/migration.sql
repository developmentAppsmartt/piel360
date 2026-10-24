-- Alcance de las reglas de edad de piel: biotipos y fototipos a los que
-- aplican. Vacío = todos, así que las reglas existentes no cambian.
ALTER TABLE "skin_age_rules" ADD COLUMN "skin_types" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "skin_age_rules" ADD COLUMN "fitzpatrick_scales" JSONB NOT NULL DEFAULT '[]';
