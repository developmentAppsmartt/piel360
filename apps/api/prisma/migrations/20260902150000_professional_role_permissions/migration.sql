-- Permisos base para roles de especialidad (registro email / OAuth Google).
-- Idempotente: solo inserta relaciones que falten.

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE r."name" IN (
  'dermatologo',
  'medico_general',
  'cirujano_plastico',
  'estetica_medica',
  'otra'
)
AND (
  p."name" IN (
    'view_any_doctor',
    'view_doctor',
    'update_doctor',
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
    'view_any_encyclopedia_entry',
    'view_encyclopedia_entry',
    'use_provider_skiniver',
    'use_provider_youcam',
    'use_provider_fitzpatrick'
  )
  OR p."slug" IN (
    'clinical.home',
    'clinical.maps',
    'clinical.maps.doctors',
    'clinical.maps.patients',
    'clinical.patients',
    'clinical.analyses',
    'clinical.plans',
    'clinical.consumption',
    'clinical.billing',
    'clinical.reports',
    'clinical.products',
    'clinical.routines',
    'clinical.skin_age_rules',
    'clinical.email_templates',
    'clinical.settings',
    'clinical.settings.account',
    'clinical.support'
  )
)
ON CONFLICT DO NOTHING;

-- Profesionales OAuth/email sin rol RBAC: asignar medico_general.
INSERT INTO "_RoleToUser" ("A", "B")
SELECT r."id", d."user_id"
FROM "roles" r
INNER JOIN "doctors" d ON d."empresa" = false AND d."empresa_referida" = false
WHERE r."name" = 'medico_general'
  AND NOT EXISTS (
    SELECT 1 FROM "_RoleToUser" ur
    INNER JOIN "roles" r2 ON r2."id" = ur."A"
    LEFT JOIN "doctor_specialties" ds ON ds."role_id" = r2."id"
    LEFT JOIN "labor_technician_profiles" ltp ON r2."labor_technician_profile_id" = ltp."id"
    WHERE ur."B" = d."user_id"
      AND (ds."id" IS NOT NULL OR ltp."id" IS NOT NULL OR r2."name" = 'empresa')
  )
ON CONFLICT DO NOTHING;
