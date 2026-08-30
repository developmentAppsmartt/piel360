-- CreateTable
CREATE TABLE "doctor_specialties" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_specialties_name_key" ON "doctor_specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_specialties_slug_key" ON "doctor_specialties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_specialties_role_id_key" ON "doctor_specialties"("role_id");

-- AddForeignKey
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing specialty roles
INSERT INTO "doctor_specialties" ("name", "slug", "sort_order", "is_active", "role_id", "created_at", "updated_at")
SELECT v.name, r.name, v.sort_order, true, r.id, NOW(), NOW()
FROM "roles" r
JOIN (
  VALUES
    ('dermatologo', 'Dermatólogo', 0),
    ('medico_general', 'Médico general', 1),
    ('cirujano_plastico', 'Cirujano plástico', 2),
    ('estetica_medica', 'Estética médica', 3),
    ('otra', 'Otra', 4)
) AS v(slug, name, sort_order) ON r.name = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM "doctor_specialties" s WHERE s.role_id = r.id
);
