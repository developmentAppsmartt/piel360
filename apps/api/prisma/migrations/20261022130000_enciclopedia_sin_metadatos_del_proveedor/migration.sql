-- Los artículos del atlas se guardaron con el <head> del sitio del proveedor:
-- JSON-LD y <meta> con su marca y sus redes sociales. No se pintan, pero sí
-- se descargan con la página, y además metían el <script> de un tercero.
-- El scraper ya los quita (REMOVE_SELECTORS); esto limpia lo ya guardado.
--
-- Dos trampas de Postgres, las dos costaron un intento:
--   * `\b` es un RETROCESO, no un límite de palabra (eso es `\y`).
--   * si el PRIMER cuantificador de la expresión es greedy, TODA la expresión
--     lo es. Con `<script[^>]*>.*?</script>` el `.*?` se comporta como `.*` y
--     se lleva por delante todo lo que hay entre el PRIMER <script> y el
--     ÚLTIMO </script>: el artículo entero. De ahí el `[^>]*?`.
--
-- Comprobado antes de aplicar:
--   select regexp_replace('<p>A</p><script>x</script><p>CUERPO</p><script>y</script>',
--                         '<script[^>]*?>.*?</script>', '', 'gi');
--   -> '<p>A</p><p>CUERPO</p>'

UPDATE encyclopedia_entries
SET content = regexp_replace(content, '<script[^>]*?>.*?</script>', '', 'gi')
WHERE content ~* '<script';

UPDATE encyclopedia_entries
SET content = regexp_replace(content, '<(meta|link)[^>]*>', '', 'gi')
WHERE content ~* '<meta|<link';
