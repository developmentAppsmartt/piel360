-- Consumo de analisis: la vista agrega subscription_usages por suscripcion y
-- por fecha; sin estos indices cada consulta era un seq scan de la tabla.
CREATE INDEX IF NOT EXISTS "subscription_usages_subscription_id_idx"
  ON "subscription_usages" ("subscription_id");

CREATE INDEX IF NOT EXISTS "subscription_usages_created_at_idx"
  ON "subscription_usages" ("created_at");
