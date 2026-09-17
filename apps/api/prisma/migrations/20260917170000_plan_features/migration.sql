-- Virtudes comerciales del plan (checklist ✓ / ✗ en catálogo)
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "features" JSONB NOT NULL DEFAULT '[]';
