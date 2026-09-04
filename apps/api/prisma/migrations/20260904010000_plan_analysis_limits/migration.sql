-- AlterTable
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "analysis_limits" JSONB NOT NULL DEFAULT '{}';
