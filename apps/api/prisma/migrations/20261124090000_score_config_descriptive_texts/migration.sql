-- Textos de biotipo (por zona) y de fototipo de Rangos de puntuación.
ALTER TABLE "account_score_configs" ADD COLUMN "descriptive_texts" JSONB NOT NULL DEFAULT '{}';
