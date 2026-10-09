-- `display_label` es el nombre del tipo de analisis que ve el usuario. El seed
-- lo renombro anadiendo "Piel 360" (commit 6324613), pero el contenedor del API
-- nunca corre el seed -- su CMD es `migrate:deploy && start:prod` --, asi que
-- produccion se quedo con el valor anterior y habia dos verdades.
--
-- Se filtra por `slug` para no tocar proveedores anadidos a mano.
UPDATE analysis_providers SET display_label = 'Análisis Dermatológico Piel 360'
 WHERE slug = 'skiniver' AND display_label IS DISTINCT FROM 'Análisis Dermatológico Piel 360';

UPDATE analysis_providers SET display_label = 'Análisis Estético Piel 360'
 WHERE slug = 'youcam' AND display_label IS DISTINCT FROM 'Análisis Estético Piel 360';

UPDATE analysis_providers SET display_label = 'Análisis de Fototipo Piel 360'
 WHERE slug = 'fitzpatrick' AND display_label IS DISTINCT FROM 'Análisis de Fototipo Piel 360';
