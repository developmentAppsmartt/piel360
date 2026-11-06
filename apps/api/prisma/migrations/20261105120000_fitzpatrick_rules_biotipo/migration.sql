-- Alcance por biotipo de las reglas de fototipo (vacío = todos los biotipos).
ALTER TABLE "fitzpatrick_rules" ADD COLUMN "skin_types" JSONB NOT NULL DEFAULT '[]';
