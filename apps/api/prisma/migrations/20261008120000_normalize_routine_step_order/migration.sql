-- Los pasos de rutina se venian creando siempre con `order = 0` (el formulario
-- enviaba 0 y el backend lo guardaba tal cual). Con todos empatados, Postgres
-- los devuelve en un orden arbitrario y reordenarlos no servia de nada.
--
-- Se les asigna 0,1,2,... por rutina. El desempate es por `id`, o sea el orden
-- de creacion, asi que las rutinas que ya tuvieran posiciones correctas no
-- cambian.
UPDATE routine_steps rs
SET "order" = sub.pos
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY routine_id ORDER BY "order", id) - 1 AS pos
  FROM routine_steps
) sub
WHERE rs.id = sub.id
  AND rs."order" <> sub.pos;
