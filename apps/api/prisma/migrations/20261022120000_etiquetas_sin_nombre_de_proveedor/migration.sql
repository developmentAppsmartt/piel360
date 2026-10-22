-- El nombre de los proveedores externos no puede llegar al navegador, y parte
-- de lo que se pinta no es código: es texto que sembró la propia plataforma.
-- El slug interno de `permissions.name`/`slug` NO se toca —los guards del API
-- comparan contra él— solo la etiqueta que se muestra.

UPDATE permissions
SET label = 'Dermatológico'
WHERE name = 'use_provider_skiniver' AND label ~* 'skiniver';

UPDATE permissions
SET label = 'Estético'
WHERE name = 'use_provider_youcam' AND label ~* 'youcam|perfect';

UPDATE permissions
SET label = 'Ejecutar análisis estético (solicitud)'
WHERE name = 'patient_run_youcam' AND label ~* 'youcam|perfect';

-- Quita la mención entre paréntesis dejando el resto de la copia comercial
-- intacta: «… por imagen (Skiniver).» → «… por imagen.»
UPDATE permissions
SET label = btrim(regexp_replace(label, '\s*\((Skiniver|YouCam|Youcam|Perfect\s*Corp)\)', '', 'gi'))
WHERE label ~* 'skiniver|youcam|perfect';

UPDATE plans
SET description = btrim(regexp_replace(description, '\s*\((Skiniver|YouCam|Youcam|Perfect\s*Corp)\)', '', 'gi'))
WHERE description ~* 'skiniver|youcam|perfect';

UPDATE plans SET name = 'Dermatológico Básico' WHERE name = 'Skiniver Básico';
UPDATE plans SET name = 'Estético Básico'      WHERE name = 'YouCam Básico';

-- Lo que quede con el nombre dentro de la frase (y no entre paréntesis) hay
-- que revisarlo a mano; esta consulta lo lista:
--   SELECT id, name, description FROM plans WHERE name ~* 'skiniver|youcam|perfect'
--      OR description ~* 'skiniver|youcam|perfect';
