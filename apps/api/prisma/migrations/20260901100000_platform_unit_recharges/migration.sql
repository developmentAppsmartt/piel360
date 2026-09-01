-- CreateTable
CREATE TABLE "platform_unit_recharges" (
    "id" BIGSERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "note" TEXT,
    "created_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_unit_recharges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_unit_recharges_provider_created_at_idx" ON "platform_unit_recharges"("provider", "created_at");

-- AddForeignKey
ALTER TABLE "platform_unit_recharges" ADD CONSTRAINT "platform_unit_recharges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
