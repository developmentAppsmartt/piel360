-- AlterTable
ALTER TABLE "analyses"
ADD COLUMN "skin_age_years" DOUBLE PRECISION,
ADD COLUMN "chronological_age_years" INTEGER,
ADD COLUMN "skin_age_difference" INTEGER;

-- AlterTable
ALTER TABLE "patients"
ADD COLUMN "last_skin_age_years" DOUBLE PRECISION,
ADD COLUMN "last_chronological_age_years" INTEGER,
ADD COLUMN "last_skin_age_difference" INTEGER,
ADD COLUMN "last_skin_age_at" TIMESTAMP(3);
