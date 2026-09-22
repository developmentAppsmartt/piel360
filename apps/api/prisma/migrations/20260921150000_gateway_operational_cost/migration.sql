-- Gasto operativo fijo (COP) en pasarela + snapshot en facturas de referidos.
ALTER TABLE "gateway_configs"
  ADD COLUMN IF NOT EXISTS "operational_cost_fixed" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "subscription_invoices"
  ADD COLUMN IF NOT EXISTS "operational_cost_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "subscription_invoices"
  ADD COLUMN IF NOT EXISTS "commission_base_amount" DECIMAL(12, 2);

-- Facturas existentes: base de comisión = neto tras pasarela (sin gasto operativo histórico).
UPDATE "subscription_invoices"
SET "commission_base_amount" = "net_after_gateway"
WHERE "commission_base_amount" IS NULL;

ALTER TABLE "subscription_invoices"
  ALTER COLUMN "commission_base_amount" SET NOT NULL;
