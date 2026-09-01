-- Elimina permisos de componentes duplicados/inactivos que ya no existen en ADMIN_COMPONENTS.

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "permissions"
  WHERE "is_active" = false
);

DELETE FROM "permissions"
WHERE "is_active" = false;
