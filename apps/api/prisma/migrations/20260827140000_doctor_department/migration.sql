-- Departamento / estado en perfil de doctor (ubicación).
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "department" TEXT;
