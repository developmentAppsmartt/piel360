-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_account_number" TEXT;

-- AlterTable
ALTER TABLE "gateway_configs" ADD COLUMN IF NOT EXISTS "fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 2.99;

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
    "id" BIGSERIAL NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "organization_id" BIGINT,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "gateway_fee_percent" DECIMAL(5,2) NOT NULL,
    "gateway_fee_amount" DECIMAL(12,2) NOT NULL,
    "net_after_gateway" DECIMAL(12,2) NOT NULL,
    "is_referred_sale" BOOLEAN NOT NULL DEFAULT false,
    "allied_commission_percent" DECIMAL(5,2),
    "allied_commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platform_net_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "wompi_transaction_id" TEXT,
    "allied_payout_status" TEXT NOT NULL DEFAULT 'none',
    "allied_dispersed_at" TIMESTAMP(3),
    "allied_dispersed_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_invoices_subscription_id_key" ON "subscription_invoices"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_invoices_organization_id_allied_payout_status_idx" ON "subscription_invoices"("organization_id", "allied_payout_status");
CREATE INDEX IF NOT EXISTS "subscription_invoices_is_referred_sale_idx" ON "subscription_invoices"("is_referred_sale");
CREATE INDEX IF NOT EXISTS "subscription_invoices_plan_id_idx" ON "subscription_invoices"("plan_id");
CREATE INDEX IF NOT EXISTS "subscription_invoices_created_at_idx" ON "subscription_invoices"("created_at");

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_allied_dispersed_by_user_id_fkey" FOREIGN KEY ("allied_dispersed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
