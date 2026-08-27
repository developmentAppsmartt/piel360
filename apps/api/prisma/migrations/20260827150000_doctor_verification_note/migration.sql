-- Observaciones de verificación (ajustes / rechazo) visibles en el perfil del doctor.
ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "verification_note" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_note_at" TIMESTAMP(3);
