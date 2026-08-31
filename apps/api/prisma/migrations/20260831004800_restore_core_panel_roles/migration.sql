-- Restaura roles base del panel si fueron eliminados (p. ej. solo quedaron especialidades + empresa).
INSERT INTO "roles" ("name", "label", "description", "is_active")
VALUES
  (
    'doctor',
    'Profesional',
    'Cuenta de profesional de salud o estética en el panel clínico.',
    true
  ),
  (
    'patient',
    'Paciente',
    'Cuenta de paciente con acceso a la app móvil y resultados compartidos.',
    true
  )
ON CONFLICT ("name") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "is_active" = true;
