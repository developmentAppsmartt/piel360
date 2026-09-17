-- Config de referidos para empresas aliadas: slug URL + comisión %.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "referral_slug" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_commission_percent" DECIMAL(5, 2);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_referral_slug_key"
  ON "organizations"("referral_slug");
