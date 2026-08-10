-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "fitzpatrick_task_id" TEXT;

-- CreateIndex
CREATE INDEX "analyses_fitzpatrick_task_id_idx" ON "analyses"("fitzpatrick_task_id");
