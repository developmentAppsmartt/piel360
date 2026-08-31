-- Permisos de mapas para el rol empresa (panel doctor → Mapas).
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" = 'empresa'
  AND p."name" IN ('view_any_doctor', 'view_doctor')
ON CONFLICT DO NOTHING;
