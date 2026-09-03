-- Módulo "Plantillas de correo" en el panel clínico (Roles y permisos).

INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  (
    'clinical.email_templates',
    'clinical.email_templates',
    'Plantillas de correo',
    'component',
    'clinical',
    '/doctor/plantillas-correo',
    102,
    NULL,
    true
  )
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "kind" = EXCLUDED."kind",
  "panel" = EXCLUDED."panel",
  "href" = EXCLUDED."href",
  "sort_order" = EXCLUDED."sort_order",
  "parent_slug" = EXCLUDED."parent_slug",
  "is_active" = true;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.email_templates'
  AND r."name" IN ('superadmin', 'empresa', 'doctor')
ON CONFLICT DO NOTHING;
