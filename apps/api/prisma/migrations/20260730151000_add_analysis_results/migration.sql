-- AlterTable
ALTER TABLE "analyses"
ADD COLUMN "provider_id" BIGINT;

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" BIGSERIAL NOT NULL,
    "analysis_id" BIGINT NOT NULL,
    "provider_id" BIGINT,
    "type" TEXT NOT NULL,
    "region" TEXT,
    "ui_score" DOUBLE PRECISION,
    "raw_score" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_masks" (
    "id" BIGSERIAL NOT NULL,
    "analysis_result_id" BIGINT NOT NULL,
    "object_key" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_masks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_analysis_results_analysis_id"
ON "analysis_results"("analysis_id");

-- CreateIndex
CREATE INDEX "idx_analysis_results_provider_id"
ON "analysis_results"("provider_id");

-- CreateIndex
CREATE INDEX "idx_analysis_results_type"
ON "analysis_results"("type");

-- CreateIndex
CREATE INDEX "idx_analysis_results_region"
ON "analysis_results"("region");

-- CreateIndex
CREATE INDEX "idx_analyses_patient_id"
ON "analyses"("patient_id");

-- CreateIndex
CREATE INDEX "idx_analyses_user_id"
ON "analyses"("user_id");

-- This intentionally coexists with the original Prisma-named index.
-- It mirrors the index that was added manually to the database.
CREATE INDEX "idx_analyses_youcam_task_id"
ON "analyses"("youcam_task_id");

-- AddForeignKey
ALTER TABLE "analyses"
ADD CONSTRAINT "analyses_provider_fk"
FOREIGN KEY ("provider_id")
REFERENCES "analysis_providers"("id");

-- AddForeignKey
ALTER TABLE "analysis_results"
ADD CONSTRAINT "fk_analysis_results_analysis"
FOREIGN KEY ("analysis_id")
REFERENCES "analyses"("id")
ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results"
ADD CONSTRAINT "fk_analysis_results_provider"
FOREIGN KEY ("provider_id")
REFERENCES "analysis_providers"("id")
ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "analysis_masks"
ADD CONSTRAINT "fk_analysis_masks_result"
FOREIGN KEY ("analysis_result_id")
REFERENCES "analysis_results"("id")
ON DELETE CASCADE;
