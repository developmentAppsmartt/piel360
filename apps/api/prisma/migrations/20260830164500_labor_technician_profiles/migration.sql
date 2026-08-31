-- CreateTable
CREATE TABLE "labor_technician_profiles" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_technician_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "labor_technician_profiles_name_key" ON "labor_technician_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "labor_technician_profiles_slug_key" ON "labor_technician_profiles"("slug");

-- Seed default profile
INSERT INTO "labor_technician_profiles" ("name", "slug", "description", "sort_order", "is_active", "created_at", "updated_at")
SELECT
  'Técnico laboral en cosmetología y estética',
  'tecnico_laboral_cosmetologia_estetica',
  'Profesional capacitado en cuidado estético facial y corporal, aplicación de tratamientos cosméticos y apoyo en procedimientos estéticos bajo supervisión.',
  0,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "labor_technician_profiles" WHERE slug = 'tecnico_laboral_cosmetologia_estetica'
);
