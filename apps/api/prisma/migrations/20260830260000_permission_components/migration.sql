-- Extender permisos con slug, metadatos y componentes del panel admin.

ALTER TABLE "permissions"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "label" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'action',
  ADD COLUMN "panel" TEXT,
  ADD COLUMN "href" TEXT,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "parent_slug" TEXT;

UPDATE "permissions"
SET
  "slug" = "name",
  "is_active" = true,
  "kind" = 'action',
  "sort_order" = 0
WHERE "slug" IS NULL;

ALTER TABLE "permissions" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");
CREATE INDEX "permissions_panel_kind_is_active_idx" ON "permissions"("panel", "kind", "is_active");

-- Componentes del panel super admin
INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  ('admin.dashboard', 'admin.dashboard', 'Panel de control', 'component', 'admin', '/admin', 10, NULL, true),
  ('admin.verification.users', 'admin.verification.users', 'Usuarios (verificación)', 'component', 'admin', '/admin/verificacion/usuarios', 20, 'admin.verification', true),
  ('admin.verification.pending', 'admin.verification.pending', 'Verificación (pendientes)', 'component', 'admin', '/admin/verificacion', 21, 'admin.verification', true),
  ('admin.verification.verified', 'admin.verification.verified', 'Verificados', 'component', 'admin', '/admin/verificacion/verificados', 22, 'admin.verification', true),
  ('admin.verification.rejected', 'admin.verification.rejected', 'Rechazados', 'component', 'admin', '/admin/verificacion/rechazados', 23, 'admin.verification', true),
  ('admin.verification.partner_companies', 'admin.verification.partner_companies', 'Empresas aliadas', 'component', 'admin', '/admin/verificacion/empresas-aliadas', 24, 'admin.verification', true),
  ('admin.verification.reports', 'admin.verification.reports', 'Reportes (verificación)', 'component', 'admin', '/admin/verificacion/reportes', 25, 'admin.verification', true),
  ('admin.verification.settings', 'admin.verification.settings', 'Configuración (verificación)', 'component', 'admin', '/admin/verificacion/configuracion', 26, 'admin.verification', true),
  ('admin.moderators', 'admin.moderators', 'Moderadores', 'component', 'admin', '/admin/moderadores', 30, NULL, true),
  ('admin.maps', 'admin.maps', 'Mapas', 'component', 'admin', '/admin/mapa', 40, NULL, true),
  ('admin.maps.doctors', 'admin.maps.doctors', 'Mapas · Médicos', 'component', 'admin', '/admin/mapa/medicos', 41, 'admin.maps', true),
  ('admin.maps.patients', 'admin.maps.patients', 'Mapas · Pacientes', 'component', 'admin', '/admin/mapa/pacientes', 42, 'admin.maps', true),
  ('admin.companies', 'admin.companies', 'Empresas', 'component', 'admin', '/admin/empresas', 50, NULL, true),
  ('admin.users', 'admin.users', 'Usuarios', 'component', 'admin', '/admin/usuarios', 60, NULL, true),
  ('admin.unit_wallet', 'admin.unit_wallet', 'Bolsa de unidades', 'component', 'admin', '/admin/bolsa-unidades', 70, NULL, true),
  ('admin.plans', 'admin.plans', 'Planes', 'component', 'admin', '/admin/planes', 80, NULL, true),
  ('admin.purchases', 'admin.purchases', 'Compras y transacciones', 'component', 'admin', '/admin/compras', 90, NULL, true),
  ('admin.reports', 'admin.reports', 'Reportes', 'component', 'admin', '/admin/reportes', 100, NULL, true),
  ('admin.billing', 'admin.billing', 'Facturación', 'component', 'admin', '/admin/facturacion', 110, NULL, true),
  ('admin.doctors', 'admin.doctors', 'Doctores', 'component', 'admin', '/admin/doctores', 120, NULL, true),
  ('admin.patients', 'admin.patients', 'Pacientes', 'component', 'admin', '/admin/pacientes', 130, NULL, true),
  ('admin.subscriptions', 'admin.subscriptions', 'Suscripciones', 'component', 'admin', '/admin/suscripciones', 140, NULL, true),
  ('admin.analysis_consumption', 'admin.analysis_consumption', 'Consumo de análisis', 'component', 'admin', '/admin/consumo', 150, NULL, true),
  ('admin.settings', 'admin.settings', 'Configuración', 'component', 'admin', '/admin/configuracion', 160, NULL, true),
  ('admin.settings.professionals', 'admin.settings.professionals', 'Profesionales', 'component', 'admin', '/admin/especialidades', 161, 'admin.settings', true),
  ('admin.settings.specialties', 'admin.settings.specialties', 'Especialidades', 'component', 'admin', '/admin/especialidades', 162, 'admin.settings.professionals', true),
  ('admin.settings.labor_technician', 'admin.settings.labor_technician', 'Técnico laboral', 'component', 'admin', '/admin/tecnico-laboral', 163, 'admin.settings.professionals', true),
  ('admin.settings.roles', 'admin.settings.roles', 'Roles y permisos', 'component', 'admin', '/admin/roles', 164, 'admin.settings', true),
  ('admin.settings.teams', 'admin.settings.teams', 'Equipos', 'component', 'admin', '/admin/configuracion/equipos', 165, 'admin.settings', true),
  ('admin.settings.referrals', 'admin.settings.referrals', 'Referidos', 'component', 'admin', '/admin/configuracion/referidos', 166, 'admin.settings', true),
  ('admin.settings.global', 'admin.settings.global', 'Configuración global', 'component', 'admin', '/admin/configuracion', 167, 'admin.settings', true),
  ('admin.audit', 'admin.audit', 'Auditoría', 'component', 'admin', '/admin/auditoria', 170, NULL, true),
  ('admin.notifications', 'admin.notifications', 'Notificaciones', 'component', 'admin', '/admin/notificaciones', 180, NULL, true),
  ('admin.help', 'admin.help', 'Ayuda', 'component', 'admin', '/admin/ayuda', 190, NULL, true)
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "kind" = EXCLUDED."kind",
  "panel" = EXCLUDED."panel",
  "href" = EXCLUDED."href",
  "sort_order" = EXCLUDED."sort_order",
  "parent_slug" = EXCLUDED."parent_slug",
  "is_active" = EXCLUDED."is_active";

-- Superadmin: todos los componentes admin activos
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" = 'superadmin'
  AND p."kind" = 'component'
  AND p."panel" = 'admin'
  AND p."is_active" = true
ON CONFLICT DO NOTHING;

-- Monitor: componentes de verificación
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" = 'monitor'
  AND p."slug" IN (
    'admin.verification.users',
    'admin.verification.pending',
    'admin.verification.verified',
    'admin.verification.rejected',
    'admin.verification.partner_companies',
    'admin.verification.reports',
    'admin.verification.settings'
  )
ON CONFLICT DO NOTHING;
