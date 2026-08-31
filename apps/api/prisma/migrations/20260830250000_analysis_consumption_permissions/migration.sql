-- Permisos RBAC para el módulo Consumo de análisis.
INSERT INTO "permissions" ("name")
VALUES
  ('view_any_analysis_consumption'),
  ('view_analysis_consumption'),
  ('create_analysis_consumption'),
  ('update_analysis_consumption'),
  ('delete_analysis_consumption'),
  ('delete_any_analysis_consumption')
ON CONFLICT ("name") DO NOTHING;

-- Superadmin recibe los permisos nuevos.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" = 'superadmin'
  AND p."name" LIKE '%_analysis_consumption'
ON CONFLICT DO NOTHING;
