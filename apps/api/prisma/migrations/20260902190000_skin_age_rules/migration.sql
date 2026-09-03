-- CreateTable
CREATE TABLE "skin_age_rules" (
    "id" BIGSERIAL NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "min_difference" INTEGER NOT NULL,
    "max_difference" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "color_key" TEXT NOT NULL DEFAULT 'blue',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "routine_ids" JSONB NOT NULL DEFAULT '[]',
    "treatment_ids" JSONB NOT NULL DEFAULT '[]',
    "product_group_ids" JSONB NOT NULL DEFAULT '[]',
    "supplement_group_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skin_age_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skin_age_rules_doctor_id_sort_order_idx" ON "skin_age_rules"("doctor_id", "sort_order");

-- AddForeignKey
ALTER TABLE "skin_age_rules" ADD CONSTRAINT "skin_age_rules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
