-- CreateTable
CREATE TABLE "specialties" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_key" ON "specialties"("name");

-- CreateIndex
CREATE INDEX "specialties_is_active_sort_order_idx" ON "specialties"("is_active", "sort_order");

-- Seed current hardcoded options
INSERT INTO "specialties" ("name", "sort_order", "is_active", "updated_at") VALUES
  ('Dermatólogo', 1, true, CURRENT_TIMESTAMP),
  ('Médico general', 2, true, CURRENT_TIMESTAMP),
  ('Cirujano plástico', 3, true, CURRENT_TIMESTAMP),
  ('Estética médica', 4, true, CURRENT_TIMESTAMP),
  ('Otra', 5, true, CURRENT_TIMESTAMP);
