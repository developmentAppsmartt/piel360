-- Plantillas de correo de plataforma: las de moderación del registro no son de
-- ningún doctor (el moderador no tiene ficha de doctor), así que `doctor_id`
-- pasa a ser opcional y NULL significa "de la plataforma".

ALTER TABLE "email_templates" ALTER COLUMN "doctor_id" DROP NOT NULL;
ALTER TABLE "email_template_variables" ALTER COLUMN "doctor_id" DROP NOT NULL;

-- Componente del panel admin para editarlas.
INSERT INTO "permissions" ("name", "slug", "label", "description", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES (
  'admin.email_templates',
  'admin.email_templates',
  'Plantillas de correo',
  'Correos que la plataforma envía al moderar un registro (rechazo, ajustes y aprobación).',
  'component',
  'admin',
  '/admin/plantillas-correo',
  175,
  NULL,
  true
)
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "kind" = EXCLUDED."kind",
  "panel" = EXCLUDED."panel",
  "href" = EXCLUDED."href",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active";

-- Superadmin y moderador (rol `monitor`): los dos moderan, los dos editan.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'admin.email_templates'
  AND r."name" IN ('superadmin', 'monitor')
ON CONFLICT DO NOTHING;
