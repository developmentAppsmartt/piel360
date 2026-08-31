-- AlterTable
ALTER TABLE "roles" ADD COLUMN "label" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "color" TEXT DEFAULT '#6C4FFB',
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "labor_technician_profile_id" BIGINT;

-- CreateTable
CREATE TABLE "role_specialty_links" (
    "role_id" BIGINT NOT NULL,
    "doctor_specialty_id" BIGINT NOT NULL,

    CONSTRAINT "role_specialty_links_pkey" PRIMARY KEY ("role_id","doctor_specialty_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_labor_technician_profile_id_key" ON "roles"("labor_technician_profile_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_labor_technician_profile_id_fkey" FOREIGN KEY ("labor_technician_profile_id") REFERENCES "labor_technician_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_specialty_links" ADD CONSTRAINT "role_specialty_links_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_specialty_links" ADD CONSTRAINT "role_specialty_links_doctor_specialty_id_fkey" FOREIGN KEY ("doctor_specialty_id") REFERENCES "doctor_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
