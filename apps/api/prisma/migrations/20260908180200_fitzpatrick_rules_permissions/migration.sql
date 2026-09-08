-- Registra el módulo "Reglas por fototipo" en catálogos admin y clínico
-- para poder asignarlo en Roles y permisos a profesionales y empresas.
-- Clon del patrón de 20260902200000_skin_age_rules_permissions.

INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  (
    'admin.fitzpatrick_rules',
    'admin.fitzpatrick_rules',
    'Reglas por fototipo',
    'component',
    'admin',
    '/admin/reglas-fototipo',
    156,
    NULL,
    true
  ),
  (
    'clinical.fitzpatrick_rules',
    'clinical.fitzpatrick_rules',
    'Reglas por fototipo',
    'component',
    'clinical',
    '/doctor/reglas-fototipo',
    103,
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
WHERE p."slug" IN ('admin.fitzpatrick_rules', 'clinical.fitzpatrick_rules')
  AND r."name" = 'superadmin'
ON CONFLICT DO NOTHING;

-- Empresa: módulo clínico por defecto (profesionales empresa)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.fitzpatrick_rules'
  AND r."name" = 'empresa'
ON CONFLICT DO NOTHING;

-- Doctor: módulo clínico (profesionales individuales)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.fitzpatrick_rules'
  AND r."name" = 'doctor'
ON CONFLICT DO NOTHING;
