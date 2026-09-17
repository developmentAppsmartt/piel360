-- Datos de beneficiario de dispersión independientes del perfil/registro app
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payout_beneficiary_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payout_beneficiary_email" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payout_legal_id_type" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payout_legal_id" TEXT;

-- Backfill desde representante legal / email comercial cuando existan
UPDATE "organizations"
SET
  "payout_beneficiary_name" = COALESCE("payout_beneficiary_name", "legal_rep_name", "name"),
  "payout_beneficiary_email" = COALESCE("payout_beneficiary_email", "business_email"),
  "payout_legal_id_type" = COALESCE("payout_legal_id_type", "legal_rep_doc_type"),
  "payout_legal_id" = COALESCE("payout_legal_id", "legal_rep_doc_number")
WHERE "type" = 'empresa_aliada';
