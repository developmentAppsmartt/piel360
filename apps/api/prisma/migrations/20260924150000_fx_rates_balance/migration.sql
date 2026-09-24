-- Balances manuales sumados a la TRM de mercado (dolarapi)
INSERT INTO "app_configs" ("key", "value", "created_at", "updated_at")
VALUES
  ('usd_to_cop_balance', '0', NOW(), NOW()),
  ('eur_to_cop_balance', '0', NOW(), NOW()),
  ('fx_rates_updated_at', '', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
