-- Verificación de existencia real de locación física (consultorio, spa, clínica, etc.)
ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "location_type" TEXT,
  ADD COLUMN IF NOT EXISTS "address_verification_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "address_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "address_verification_method" TEXT,
  ADD COLUMN IF NOT EXISTS "address_verification_evidence_key" TEXT;
