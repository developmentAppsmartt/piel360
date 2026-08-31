-- Elimina componentes duplicados de verificación (Usuarios, Reportes, Configuración)
-- que repetían módulos del panel admin principal.

UPDATE "permissions"
SET "is_active" = false
WHERE "slug" IN (
  'admin.verification.users',
  'admin.verification.reports',
  'admin.verification.settings',
  'admin.verification.partner_companies'
);

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "permissions"
  WHERE "slug" IN (
    'admin.verification.users',
    'admin.verification.reports',
    'admin.verification.settings',
    'admin.verification.partner_companies'
  )
);
