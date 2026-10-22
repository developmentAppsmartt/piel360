// Falla si el nombre de algún proveedor externo llega al navegador.
//
// Revisa lo que el navegador DESCARGA de verdad: los chunks de `static/` y el
// HTML/RSC ya renderizado de `server/app`. El resto de `.next/server` es código
// que solo corre en el servidor, así que no cuenta.
//
// Correr DESPUÉS de `pnpm turbo run build`:
//   node scripts/sin-nombres-de-proveedor.mjs
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const NEXT = join(RAIZ, "apps", "web", ".next");

/** Las tres palabras prohibidas. `fitzpatrick` NO está: es una escala médica. */
const PROHIBIDAS = /youcam|skiniver|perfect/gi;

/** Lo que el navegador descarga. `server/app` incluye el HTML prerenderizado y
 * las cargas RSC, que viajan igual que un chunk. */
const SUPERFICIES = [
  { dir: join(NEXT, "static"), extensiones: null },
  { dir: join(NEXT, "server", "app"), extensiones: [".html", ".rsc", ".body"] },
];

function* archivos(dir, extensiones) {
  if (!existsSync(dir)) return;
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      yield* archivos(ruta, extensiones);
    } else if (!extensiones || extensiones.some((e) => entrada.endsWith(e))) {
      yield ruta;
    }
  }
}

if (!existsSync(NEXT)) {
  console.error("No hay build en apps/web/.next — corre antes `pnpm turbo run build`.");
  process.exit(2);
}

const hallazgos = [];
for (const { dir, extensiones } of SUPERFICIES) {
  for (const ruta of archivos(dir, extensiones)) {
    const texto = readFileSync(ruta, "utf8");
    const encontradas = texto.match(PROHIBIDAS);
    if (encontradas) {
      const conteo = {};
      for (const palabra of encontradas) {
        conteo[palabra] = (conteo[palabra] ?? 0) + 1;
      }
      hallazgos.push({ ruta: relative(RAIZ, ruta), conteo });
    }
  }
}

if (hallazgos.length === 0) {
  console.log("OK — ningún nombre de proveedor llega al navegador.");
  process.exit(0);
}

const total = hallazgos.reduce(
  (suma, h) => suma + Object.values(h.conteo).reduce((a, b) => a + b, 0),
  0,
);
console.error(`FALLA — ${total} ocurrencias en ${hallazgos.length} archivos:\n`);
for (const { ruta, conteo } of hallazgos.slice(0, 60)) {
  const detalle = Object.entries(conteo)
    .map(([palabra, n]) => `${palabra}×${n}`)
    .join(", ");
  console.error(`  ${ruta} — ${detalle}`);
}
if (hallazgos.length > 60) {
  console.error(`  … y ${hallazgos.length - 60} archivos más`);
}
process.exit(1);
