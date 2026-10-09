-- Registra el submódulo "Personalización" de Configuración en el catálogo
-- clínico para poder asignarlo o quitarlo en Roles y permisos.
-- Mismo patrón que 20260908180200_fitzpatrick_rules_permissions.

INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  (
    'clinical.settings.personalization',
    'clinical.settings.personalization',
    'Personalización',
    'component',
    'clinical',
    '/doctor/configuracion/personalizacion',
    114,
    'clinical.settings',
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

-- Superadmin y empresa: activo por defecto
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.settings.personalization'
  AND r."name" IN ('superadmin', 'empresa')
ON CONFLICT DO NOTHING;
