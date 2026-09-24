-- Gasto operativo % en pasarela
ALTER TABLE "gateway_configs"
  ADD COLUMN IF NOT EXISTS "operational_cost_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- Costos API + IVA por plan
ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "api_costs" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "iva_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Snapshot ampliado en facturas de suscripción
ALTER TABLE "subscription_invoices"
  ADD COLUMN IF NOT EXISTS "plan_base_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iva_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iva_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "operational_cost_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "api_token_cost_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "usd_rate_snapshot" DECIMAL(12, 4),
  ADD COLUMN IF NOT EXISTS "eur_rate_snapshot" DECIMAL(12, 4);

-- Rellenar plan_base_amount con el bruto histórico (antes no había IVA)
UPDATE "subscription_invoices"
SET "plan_base_amount" = "gross_amount"
WHERE "plan_base_amount" = 0 AND "gross_amount" > 0;

-- TRM e IVA global (AppConfig)
INSERT INTO "app_configs" ("key", "value", "created_at", "updated_at")
VALUES
  ('usd_to_cop', '3500', NOW(), NOW()),
  ('eur_to_cop', '3800', NOW(), NOW()),
  ('iva_percent_default', '19', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
