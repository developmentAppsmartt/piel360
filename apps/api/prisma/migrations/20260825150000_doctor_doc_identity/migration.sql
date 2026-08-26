-- Identidad civil del doctor (además de birth_date / gender ya existentes)
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "doc_type" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "doc_number" TEXT;
