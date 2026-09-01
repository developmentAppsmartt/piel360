-- Panel principal por rol + permisos de módulos clínicos (clinical.*)

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "primary_panel" TEXT DEFAULT 'clinical';

UPDATE "roles"
SET "primary_panel" = 'admin'
WHERE "name" IN ('superadmin', 'monitor');

UPDATE "roles"
SET "primary_panel" = 'patient'
WHERE "name" = 'patient';

UPDATE "roles"
SET "primary_panel" = 'clinical'
WHERE "primary_panel" IS NULL;
