-- AlterTable
ALTER TABLE "analyses"
ADD COLUMN "shared_with_patient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shared_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_analyses_shared_with_patient"
ON "analyses"("shared_with_patient");
