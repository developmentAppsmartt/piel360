-- Cobertura comercial del plan (condiciones estéticas y dermatológicas).
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "coverage" JSONB NOT NULL DEFAULT '{}';
