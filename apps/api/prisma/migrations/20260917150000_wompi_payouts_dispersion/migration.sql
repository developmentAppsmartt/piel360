-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_account_type" TEXT;

-- AlterTable gateway_configs
ALTER TABLE "gateway_configs" ADD COLUMN IF NOT EXISTS "payout_api_key" TEXT;
ALTER TABLE "gateway_configs" ADD COLUMN IF NOT EXISTS "payout_user_principal_id" TEXT;
ALTER TABLE "gateway_configs" ADD COLUMN IF NOT EXISTS "payout_account_id" TEXT;

-- AlterTable subscription_invoices
ALTER TABLE "subscription_invoices" ADD COLUMN IF NOT EXISTS "allied_payout_batch_id" BIGINT;

-- CreateTable allied_payout_batches
CREATE TABLE IF NOT EXISTS "allied_payout_batches" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "wompi_payout_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "admin_user_id" BIGINT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allied_payout_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "allied_payout_batches_reference_key" ON "allied_payout_batches"("reference");
CREATE INDEX IF NOT EXISTS "allied_payout_batches_organization_id_status_idx" ON "allied_payout_batches"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "allied_payout_batches_status_idx" ON "allied_payout_batches"("status");

DO $$ BEGIN
  ALTER TABLE "allied_payout_batches" ADD CONSTRAINT "allied_payout_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "subscription_invoices_allied_payout_batch_id_idx" ON "subscription_invoices"("allied_payout_batch_id");

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_allied_payout_batch_id_fkey" FOREIGN KEY ("allied_payout_batch_id") REFERENCES "allied_payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
