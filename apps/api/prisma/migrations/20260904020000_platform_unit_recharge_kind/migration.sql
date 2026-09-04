-- AlterTable
ALTER TABLE "platform_unit_recharges"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'recharge';

CREATE INDEX IF NOT EXISTS "platform_unit_recharges_provider_kind_created_at_idx"
  ON "platform_unit_recharges"("provider", "kind", "created_at");
