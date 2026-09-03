-- El módulo admin.doctors pasa a llamarse "Profesionales" en el catálogo RBAC.
UPDATE "permissions"
SET "label" = 'Profesionales'
WHERE "slug" = 'admin.doctors';
