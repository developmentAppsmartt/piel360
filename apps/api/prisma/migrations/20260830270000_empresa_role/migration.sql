-- Rol RBAC `empresa` para cuentas empresariales y backfill de usuarios existentes.

INSERT INTO "roles" ("name", "label", "description", "color", "is_active")
VALUES (
  'empresa',
  'Empresa',
  'Cuenta empresarial con equipo, planes business y gestión de organización.',
  '#0EA5E9',
  true
)
ON CONFLICT ("name") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "is_active" = EXCLUDED."is_active";

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" = 'empresa'
  AND p."name" IN (
    'view_any_patient',
    'view_patient',
    'create_patient',
    'update_patient',
    'view_any_analysis',
    'view_analysis',
    'create_analysis',
    'view_any_plan',
    'view_plan',
    'view_any_subscription',
    'view_subscription',
    'view_any_analysis_consumption',
    'view_analysis_consumption',
    'view_organization',
    'create_organization',
    'update_organization',
    'view_any_encyclopedia_entry',
    'view_encyclopedia_entry'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "_RoleToUser" ("A", "B")
SELECT r."id", d."user_id"
FROM "roles" r
INNER JOIN "doctors" d ON d."empresa" = true OR d."membership_type" IN ('empresa', 'empresa_aliada')
WHERE r."name" = 'empresa'
ON CONFLICT DO NOTHING;
