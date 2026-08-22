-- CreateTable
CREATE TABLE "routines" (
    "id" BIGSERIAL NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_conditions" (
    "id" BIGSERIAL NOT NULL,
    "routine_id" BIGINT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "region" TEXT,
    "operator" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_steps" (
    "id" BIGSERIAL NOT NULL,
    "routine_id" BIGINT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "media_url" TEXT,
    "media_type" TEXT,
    "product_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routines_doctor_id_idx" ON "routines"("doctor_id");

-- CreateIndex
CREATE INDEX "routine_conditions_routine_id_idx" ON "routine_conditions"("routine_id");

-- CreateIndex
CREATE INDEX "routine_steps_routine_id_idx" ON "routine_steps"("routine_id");

-- CreateIndex
CREATE INDEX "routine_steps_product_id_idx" ON "routine_steps"("product_id");

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_conditions" ADD CONSTRAINT "routine_conditions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_steps" ADD CONSTRAINT "routine_steps_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_steps" ADD CONSTRAINT "routine_steps_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
