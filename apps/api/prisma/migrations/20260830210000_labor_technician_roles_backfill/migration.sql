-- Cada perfil de técnico laboral debe tener un rol RBAC para la matriz especialidad × servicio.
DO $$
DECLARE
  rec RECORD;
  new_role_id BIGINT;
BEGIN
  FOR rec IN
    SELECT ltp.id, ltp.slug
    FROM labor_technician_profiles ltp
    WHERE NOT EXISTS (
      SELECT 1 FROM roles r WHERE r.labor_technician_profile_id = ltp.id
    )
  LOOP
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = rec.slug) THEN
      INSERT INTO roles (name, is_active) VALUES (rec.slug, true) RETURNING id INTO new_role_id;
      UPDATE roles SET labor_technician_profile_id = rec.id WHERE id = new_role_id;
    ELSE
      UPDATE roles
      SET labor_technician_profile_id = rec.id
      WHERE name = rec.slug AND labor_technician_profile_id IS NULL;
    END IF;
  END LOOP;
END $$;
