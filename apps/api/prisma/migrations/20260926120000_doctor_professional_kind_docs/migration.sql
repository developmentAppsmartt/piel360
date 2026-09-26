-- El registro de profesionales pasa a pedir campos y documentos distintos
-- segun el tipo de profesional, asi que hay que guardar cual eligio.
ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "professional_kind" TEXT;

-- Documentos nuevos. El diploma/certificado de acreditacion academica del
-- tecnico laboral reutiliza "medical_registry_doc_key", por eso solo son 3.
ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "diploma_postgrado_doc_key" TEXT,
  ADD COLUMN IF NOT EXISTS "health_registration_doc_key" TEXT,
  ADD COLUMN IF NOT EXISTS "biosafety_cert_doc_key" TEXT;
