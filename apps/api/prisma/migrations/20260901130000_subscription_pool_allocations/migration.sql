-- CreateTable
CREATE TABLE "subscription_pool_allocations" (
    "id" BIGSERIAL NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "pool_provider" TEXT NOT NULL,
    "allocated" INTEGER NOT NULL,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pool_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_pool_allocations_subscription_id_key" ON "subscription_pool_allocations"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_pool_allocations_pool_provider_idx" ON "subscription_pool_allocations"("pool_provider");

-- AddForeignKey
ALTER TABLE "subscription_pool_allocations" ADD CONSTRAINT "subscription_pool_allocations_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
