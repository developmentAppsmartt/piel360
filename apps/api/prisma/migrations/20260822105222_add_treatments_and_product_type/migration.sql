-- AlterTable
ALTER TABLE "products" ADD COLUMN     "product_type" TEXT NOT NULL DEFAULT 'product';

-- CreateTable
CREATE TABLE "treatment_categories" (
    "id" BIGSERIAL NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "category_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" BIGSERIAL NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_conditions" (
    "id" BIGSERIAL NOT NULL,
    "treatment_id" BIGINT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "region" TEXT,
    "operator" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_products" (
    "id" BIGSERIAL NOT NULL,
    "treatment_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "order" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatment_categories_doctor_id_idx" ON "treatment_categories"("doctor_id");

-- CreateIndex
CREATE INDEX "treatments_doctor_id_idx" ON "treatments"("doctor_id");

-- CreateIndex
CREATE INDEX "treatments_category_id_idx" ON "treatments"("category_id");

-- CreateIndex
CREATE INDEX "treatment_conditions_treatment_id_idx" ON "treatment_conditions"("treatment_id");

-- CreateIndex
CREATE INDEX "treatment_products_treatment_id_idx" ON "treatment_products"("treatment_id");

-- CreateIndex
CREATE INDEX "treatment_products_product_id_idx" ON "treatment_products"("product_id");

-- CreateIndex
CREATE INDEX "products_product_type_idx" ON "products"("product_type");

-- AddForeignKey
ALTER TABLE "treatment_categories" ADD CONSTRAINT "treatment_categories_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "treatment_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_conditions" ADD CONSTRAINT "treatment_conditions_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_products" ADD CONSTRAINT "treatment_products_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_products" ADD CONSTRAINT "treatment_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
