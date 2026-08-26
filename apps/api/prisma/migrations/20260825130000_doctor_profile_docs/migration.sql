-- Perfil profesional + documentos en registro doctor
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "medical_registry" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "license_number" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "education_entity" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "graduation_institution" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "cedula_doc_key" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "medical_registry_doc_key" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "diploma_doc_key" TEXT;
