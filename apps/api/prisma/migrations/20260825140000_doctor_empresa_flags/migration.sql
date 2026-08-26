-- Flags de funcionalidad empresa (ya no son roles RBAC)
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "empresa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "empresa_referida" BOOLEAN NOT NULL DEFAULT false;

-- Backfill desde membership_type
UPDATE "doctors"
SET "empresa" = true
WHERE "membership_type" IN ('empresa', 'empresa_aliada');

UPDATE "doctors"
SET "empresa_referida" = true
WHERE "membership_type" = 'empresa_aliada';

-- Backfill desde roles legacy (si existen)
UPDATE "doctors" d
SET "empresa" = true
FROM "_RoleToUser" ru
JOIN "roles" r ON r."id" = ru."A"
WHERE ru."B" = d."user_id"
  AND r."name" IN ('empresa', 'empresa_aliada');

UPDATE "doctors" d
SET "empresa_referida" = true
FROM "_RoleToUser" ru
JOIN "roles" r ON r."id" = ru."A"
WHERE ru."B" = d."user_id"
  AND r."name" = 'empresa_aliada';

-- Asegurar rol doctor a quienes solo tenían empresa*
INSERT INTO "_RoleToUser" ("A", "B")
SELECT dr."id", ru."B"
FROM "_RoleToUser" ru
JOIN "roles" er ON er."id" = ru."A" AND er."name" IN ('empresa', 'empresa_aliada')
CROSS JOIN "roles" dr
WHERE dr."name" = 'doctor'
ON CONFLICT DO NOTHING;

-- Quitar asignaciones de roles empresa*
DELETE FROM "_RoleToUser" ru
USING "roles" r
WHERE ru."A" = r."id"
  AND r."name" IN ('empresa', 'empresa_aliada');

-- Eliminar roles legacy
DELETE FROM "roles" WHERE "name" IN ('empresa', 'empresa_aliada');
