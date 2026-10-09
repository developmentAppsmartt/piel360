-- Rangos de puntuación del análisis estético por cuenta.
CREATE TABLE "account_score_configs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "default_mode" TEXT NOT NULL DEFAULT 'real',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_score_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_score_configs_user_id_key" ON "account_score_configs"("user_id");

-- Puntaje (real o modificado) que ve el paciente en cada análisis.
ALTER TABLE "analyses" ADD COLUMN "score_mode" TEXT;
