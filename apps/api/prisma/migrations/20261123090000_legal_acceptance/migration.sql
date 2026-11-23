-- Términos, política de datos y consentimiento previo al análisis.
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN "privacy_accepted_at" TIMESTAMP(3),
  ADD COLUMN "legal_version" TEXT;

ALTER TABLE "analyses" ADD COLUMN "consent_accepted_at" TIMESTAMP(3);
