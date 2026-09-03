-- Registra el módulo "Reglas por edad de piel" en catálogos admin y clínico
-- para poder asignarlo en Roles y permisos a profesionales y empresas.

INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  (
    'admin.skin_age_rules',
    'admin.skin_age_rules',
    'Reglas por edad de piel',
    'component',
    'admin',
    '/admin/reglas-edad-piel',
    155,
    NULL,
    true
  ),
  (
    'clinical.skin_age_rules',
    'clinical.skin_age_rules',
    'Reglas por edad de piel',
    'component',
    'clinical',
    '/doctor/reglas-edad-piel',
    101,
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

-- Superadmin: acceso a ambos módulos
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" IN ('admin.skin_age_rules', 'clinical.skin_age_rules')
  AND r."name" = 'superadmin'
ON CONFLICT DO NOTHING;

-- Empresa: módulo clínico por defecto (profesionales empresa)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.skin_age_rules'
  AND r."name" = 'empresa'
ON CONFLICT DO NOTHING;

-- Doctor: módulo clínico (profesionales individuales)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.skin_age_rules'
  AND r."name" = 'doctor'
ON CONFLICT DO NOTHING;
