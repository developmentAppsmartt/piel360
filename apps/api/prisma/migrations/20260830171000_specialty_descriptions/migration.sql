-- AlterTable
ALTER TABLE "doctor_specialties" ADD COLUMN "description" TEXT;

-- Backfill descriptions
UPDATE "doctor_specialties" SET "description" = 'Especialista en el diagnóstico y tratamiento de enfermedades de la piel, cabello y uñas.' WHERE "slug" = 'dermatologo';
UPDATE "doctor_specialties" SET "description" = 'Profesional de medicina general con enfoque en salud integral y derivación a especialistas.' WHERE "slug" = 'medico_general';
UPDATE "doctor_specialties" SET "description" = 'Especialista en procedimientos quirúrgicos y reconstructivos estéticos.' WHERE "slug" = 'cirujano_plastico';
UPDATE "doctor_specialties" SET "description" = 'Especialista en procedimientos estéticos no invasivos y mejora de la apariencia facial y corporal.' WHERE "slug" = 'estetica_medica';
