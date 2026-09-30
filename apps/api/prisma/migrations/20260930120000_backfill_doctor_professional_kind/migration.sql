-- "professional_kind" se agrego en 20260926120000 y decide que campos y que
-- documentos se le piden a un profesional (apps/web/src/lib/doctor-documents.ts).
-- Todos los registros anteriores quedaron en NULL, y como el fallback es
-- "especialidad medica", el panel de verificacion le exigia registro medico y
-- diplomas universitarios tambien a los tecnicos laborales.
--
-- Se clasifican con el unico dato disponible: la especialidad. Si coincide con
-- un perfil del catalogo de tecnicos, es tecnico laboral; si no, especialidad
-- medica.

UPDATE "doctors" d
   SET "professional_kind" = 'labor'
 WHERE d."professional_kind" IS NULL
   AND d."specialty" IN (SELECT "name" FROM "labor_technician_profiles");

UPDATE "doctors"
   SET "professional_kind" = 'specialty'
 WHERE "professional_kind" IS NULL
   AND "specialty" IS NOT NULL;

-- Los doctores sin especialidad se dejan en NULL a proposito: no hay con que
-- clasificarlos, y el fallback ya los trata como especialidad medica.
