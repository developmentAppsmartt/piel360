# Piel 360

Plataforma de dermatología con IA. Monorepo pnpm + Turborepo.

**Toda la comunicación con el usuario es en español.** El código, los nombres de
variables y los commits también van en español, siguiendo lo que ya hay.

---

## Cómo trabajar en este repo

Estas reglas van primero porque aplican a cada cambio, no solo a los grandes.
**No son sugerencias: un cambio que las incumpla se devuelve.**

Si te sirven las siglas: lo de abajo es **KISS**, **DRY** y **SOLID** escritos
en concreto y con los casos reales de este proyecto. Están desarrollados ahí,
no repetidos aquí — la **S** de SOLID es «Responsabilidad única», **DRY** vive
en «Nada de boilerplate» y **KISS** en «Nada de sobreingeniería». De las otras
cuatro de SOLID, las que de verdad se aplican seguido son la **O** (extender
sin tener que reescribir lo que ya funciona) y la **D** (depender de una
función o un tipo, no de un detalle interno de otro módulo).

### No alucines: pregunta

Si una decisión depende de algo que no entiendes al 100% —una regla de negocio,
qué espera el cliente, cómo se comporta un proveedor externo, qué significa un
campo— **pregunta antes de implementar**. Una pregunta corta cuesta mucho menos
que código que hay que deshacer.

No inventes nombres de campos, endpoints, tablas ni flags: **verifícalos** en el
repo o en la base antes de usarlos. Si afirmas que algo funciona, que sea porque
lo ejecutaste, no porque lo leíste.

Verifica empíricamente: reproduce → arregla → vuelve a comprobar → busca
regresiones. Varias veces en este proyecto la comprobación contra datos reales
desmintió una conclusión que parecía evidente leyendo el código.

### Nada de boilerplate

- No crees capas, interfaces, fábricas, wrappers ni abstracciones "por si acaso".
- No dupliques marcado ni lógica: si algo se repite en dos sitios, extráelo —
  pero solo cuando ya se repite, no antes.
- Antes de escribir una función, **busca si ya existe**. Este repo tiene mucho
  reutilizable (`subscription-utils.ts`, `condition-labels.ts`,
  `skiniver-labels.ts`, `ModuleCard`, `CatalogCombobox`…).
- No añadas comentarios que repitan lo que dice el código. Los comentarios de
  aquí explican **por qué**, normalmente un caso real que se rompió.

### Responsabilidad única

Cada archivo, componente y función hace **una cosa**. Si para describir algo
necesitas un "y", probablemente son dos.

- La lógica de negocio no vive en los componentes: va a utilidades o al API.
- Un componente que calcula, filtra y además pinta, se parte.
- Un servicio del API que orquesta y además formatea, se parte.

**Ningún archivo pasa de 400 líneas**, y lo verifica ESLint (`max-lines`, en
`packages/config/eslint.max-lines.mjs`). No es una regla de formato: un archivo
que crece así casi siempre está haciendo más de una cosa.

Cuando salte, **parte por responsabilidad**. No aprietes el código ni metas el
archivo en `ARCHIVOS_LARGOS_HEREDADOS` de `eslint.config.mjs`: esa lista son
los archivos que ya estaban largos el día que entró la regla —deuda reconocida,
no permiso— y **solo puede encoger**. Si tocas uno de ellos, pártelo y bórralo
de la lista. Nunca se añade un archivo nuevo.

### Nada de espagueti

Lo contrario de sobreingeniería no es desorden. Está prohibido:

- Funciones que se llaman en cadena por media app sin que se vea quién manda.
- Estado compartido que cualquiera muta desde cualquier sitio.
- Condicionales anidados de tres o más niveles: saca una función con nombre, o
  invierte la condición y sal temprano.
- Un `useEffect` que arregla lo que debería haberse calculado bien de entrada
  (en este repo `react-hooks/set-state-in-effect` es **error**: deriva con
  `useMemo`).
- Copiar un bloque "y le cambio dos cosas". Eso es el origen de los bugs que
  solo se arreglan en una de las dos copias.

Si para entender un cambio hay que saltar por cinco archivos, está mal
repartido.

### Nada de sobreingeniería

- Resuelve **lo que se pidió**, en el alcance que se pidió. Ni más ni menos.
- La solución más simple que funciona gana. Si dudas entre dos, elige la que
  tenga menos piezas móviles.
- No generalices para un caso futuro hipotético.
- No introduzcas librerías nuevas si se puede con lo que ya hay. Los gráficos y
  barras de progreso de este proyecto son SVG/CSS a mano, a propósito.

### Alcance y entrega

- Si el usuario pide algo en una pantalla y el mismo problema existe en su
  pantalla gemela (crear/editar, web/mobile), **díselo y propón**; no lo amplíes
  en silencio ni lo ignores.
- Los commits los crea el asistente; **el `push` lo hace siempre el usuario**.
- **Antes de dar por terminado un cambio hay que compilarlo.** Sin excepción:

  ```bash
  pnpm turbo run build
  pnpm turbo run lint
  ```

  **Ojo: el `lint` del API lleva `--fix`** y reformatea con Prettier todo
  `apps/api` (decenas de archivos). Tras correrlo, revisa `git status` y
  deshaz lo que no sea tuyo antes de hacer commit.
  A producción no llega código roto. Que compile no es que funcione: el build
  es el mínimo, encima van las comprobaciones de «No alucines».
- Al terminar, di qué quedó sin hacer y por qué, y qué hace falta para desplegar.

---

## Arquitectura

| Paquete | Qué es | Dónde corre |
|---|---|---|
| `apps/api` | NestJS + Prisma 7 | VPS propio, Docker Compose |
| `apps/web` | Next.js (App Router), el CRM | **Vercel** |
| `apps/mobile` | Expo / React Native | Expo |
| `packages/shared` | Tipos y lógica común (`@piel360/shared`) | Se compila a `dist/` |

Node >= 22.13, pnpm 11.3.

> El README dice "Railway/Vercel" para producción: **está desactualizado**. El
> API ya no está en Railway, está en el VPS. Lo de abajo es lo vigente.

### Tres reglas de integración que se olvidan

1. **`apps/mobile` NO puede importar `@piel360/shared`** (Metro no resuelve el
   workspace). Lo que necesita se copia como espejo documentado —ver
   `apps/mobile/src/types/skiniver-labels.ts` y el parseo en
   `src/types/analysis.ts`—. Si tocas el original en `shared`, **copia el cambio
   al espejo**.
2. **Si cambias `packages/shared`, hay que RECONSTRUIR la imagen del API**, no
   reiniciarla.
3. El API usa `ValidationPipe` con `whitelist: true, forbidNonWhitelisted: true`:
   **una propiedad que no esté en el DTO devuelve 400**. Si añades un campo al
   front, añádelo también al DTO.

---

## Despliegue

### API — VPS (CloudPanel + Docker Compose)

- Ruta: **`/opt/piel360`**. Acceso por SSH como `root`.
- `docker-compose.yml` levanta tres servicios: `api`, `postgres`, `redis`.
- Postgres y Redis **no** se publican a internet, solo viven en la red interna.
- El API se publica en `127.0.0.1:4000` → `3000` del contenedor. CloudPanel pone
  Nginx + SSL por delante como reverse proxy; **no se toca Nginx a mano**.
- Variables en `/opt/piel360/.env.production` (no está en el repo).
- `docs/despliegue-vps.md` es la guía completa.

Desplegar una actualización:

```bash
cd /opt/piel360
git pull
docker compose --env-file .env.production up -d --build
```

**Las migraciones corren solas.** El `CMD` de la imagen es
`pnpm run migrate:deploy && pnpm run start:prod`, así que cada arranque del
contenedor aplica las migraciones pendientes. No hace falta ejecutarlas a mano.

El `--env-file .env.production` **es obligatorio en todos los `docker compose`**.
Sin él aparece `WARN The "POSTGRES_PASSWORD" variable is not set` y Compose
sustituye por cadena vacía; en `logs` o `ps` es inofensivo, en `up` no lo es.

Rutas del API: prefijo global **`/api`**, con tres excepciones fuera del prefijo
—`/health`, `/webhooks/wompi` y `/webhooks/youcam`— porque esas URLs ya están
registradas en los dashboards externos. CORS se abre contra `FRONTEND_URL`.

### Web — Vercel

Un redeploy basta; no necesita cambios de código. Variables relevantes:
`API_URL` y `NEXT_PUBLIC_API_URL` (ambas **con `/api` al final**) y
`BACKEND_ORIGIN` (sin `/api`, para el rewrite de `next.config.ts`).

### Mobile — Expo

Los arreglos del móvil **no se resuelven desplegando el API**: necesitan build
nuevo de la app.

---

## Logs y diagnóstico en producción

**No hay Sentry ni ninguna herramienta de seguimiento de errores.** Los logs son
lo único que hay.

```bash
cd /opt/piel360
docker compose logs api -t \
  --since 2026-10-02T11:00:00-05:00 \
  --until 2026-10-02T15:00:00-05:00
```

Cuatro cosas que hacen perder tiempo si no se saben:

- **El contenedor corre en UTC** (no se fija `TZ`). Colombia es UTC−5, así que
  las marcas dentro del log van 5 horas adelantadas. `--since`/`--until` aceptan
  el huso (`-05:00`), así no hay que convertir a mano.
- **`docker compose logs` solo tiene la salida del contenedor ACTUAL.** Un
  `up -d --build` lo recrea y **borra los logs anteriores**. Antes de buscar algo
  de hace días, comprueba desde cuándo vive el contenedor:
  `docker inspect -f '{{.State.StartedAt}}' $(docker compose ps -q api)`.
- No hay rotación configurada, así que mientras el contenedor no se recree, el
  histórico completo está ahí.
- Los errores del **web** están en Vercel, no en el VPS, y su retención de logs
  de runtime es corta.

### Base de datos en producción

```bash
docker compose exec postgres psql -U piel360 -d piel360
docker compose exec postgres pg_dump -U piel360 piel360 > backup_$(date +%Y%m%d).sql
```

#### Conectar DBeaver a la base de producción

`docker-compose.yml` **no publica el puerto de Postgres** a propósito: la base
solo existe dentro de la red de Docker, así que ni el propio host del VPS la
alcanza por `localhost`. Para mirarla desde un cliente se publica **solo en la
interfaz local del VPS** y se llega por un túnel SSH.

En el VPS hay un `/opt/piel360/docker-compose.override.yml` que Compose lee
solo. **No está en el repo**, así que sobrevive a los `git pull` — y por eso
`git status` en `/opt/piel360` lo muestra como *untracked*: es esperado, no es
un cambio local que haya que revisar.

```yaml
services:
  postgres:
    ports:
      - "127.0.0.1:5432:5432"
```

Si hay que recrearlo: `docker compose --env-file .env.production up -d postgres`
(unos segundos sin base, el API reconecta solo; el volumen `pgdata` no se toca).
Comprueba que no quedó abierto a internet — `ss -tlnp | grep 5432` tiene que
decir `127.0.0.1:5432`, nunca `0.0.0.0:5432`.

En DBeaver, conexión PostgreSQL:

| Pestaña | Campo | Valor |
|---|---|---|
| Main | Host / Port | `localhost` / `5432` |
| Main | Database / User | los de `/opt/piel360/.env.production` |
| SSH | Use SSH Tunnel | sí |
| SSH | Host / Port / User | `195.35.32.212` / `22` / `root` |

**El `localhost:5432` de la pestaña Main se resuelve dentro del VPS**, al otro
lado del túnel, así que **no choca con el Postgres local**, que sigue en el
5432 de tu máquina. DBeaver abre su propio puerto local para el túnel; si
quieres fijarlo, en la pestaña SSH hay *Local port* (p. ej. `55432`). Con un
túnel a mano sí hay que cambiarlo: `ssh -L 55432:localhost:5432 root@...`.

Para mirar producción se usa **`piel360_ro`**, un usuario de solo lectura
(`GRANT SELECT` sobre `public` + `ALTER DEFAULT PRIVILEGES`, y
`ALTER ROLE … SET default_transaction_read_only = on`, que hace fallar
cualquier escritura aunque alguien le conceda permisos por error). Su clave
está en `apps/api/.env.produccion`. Las del dueño (`piel360`) se guardan solo
para emergencias: un `UPDATE` sin `WHERE` desde un cliente gráfico no se
deshace.

El `ALTER DEFAULT PRIVILEGES` solo cubre las tablas que cree **el rol que
ejecutó la sentencia** — en producción, `piel360`, que es el `POSTGRES_USER`
del contenedor y quien corre las migraciones. Si algún día migraran con otro
rol, las tablas nuevas no serían visibles y habría que repetir el `GRANT`.

#### Tres archivos de entorno, uno por sitio

| Archivo | Dónde vive | Quién lo lee |
|---|---|---|
| `apps/api/.env` | tu máquina | el API, Prisma, los seeds y las pruebas. Su `DATABASE_URL` apunta **siempre** a la base local |
| `apps/api/.env.produccion` | tu máquina | **nada**: es la referencia de las credenciales de producción para conectarse con DBeaver o `psql` por el túnel |
| `/opt/piel360/.env.production` | el VPS | `docker compose --env-file`, que levanta el stack |

Los dos locales están fuera de git (`.env` en `apps/api/.gitignore`, `.env.*`
en el de la raíz). `ConfigModule.forRoot()` carga **solo `.env`**, así que
`.env.produccion` es inerte: existe para consultarlo, no para que algo lo
cargue.

**La regla que no se salta nadie: `DATABASE_URL` en `apps/api/.env` apunta a
la base local y punto.** Ese archivo lo leen los seeds y las pruebas de extremo
a extremo, que **borran filas**; el día que apunte a producción, el siguiente
`pnpm run seed:empresa-demo` se lleva datos reales por delante. Para hablar con
producción se usa el túnel, nunca el entorno del API.

---

## Desarrollo local

```bash
docker start piel360-db piel360-redis   # Postgres 16 y Redis 7
pnpm dev                                # todo el workspace
```

- API en `http://localhost:3000` (Swagger en `/docs`), Web en `http://localhost:3001`.
- `apps/web/.env.local` → `NEXT_PUBLIC_API_URL="http://localhost:3000/api"`.
- **`JWT_SECRET` tiene que ser idéntico** en `apps/api/.env` y `apps/web/.env.local`:
  el proxy de Next verifica ahí la firma de los tokens que emite el API.
- Comprobar que compila: `pnpm turbo run build` y `pnpm turbo run lint`.

### Consultar la base local

El servidor MCP de postgres **no conecta**. Usa `pg` desde el `node_modules` de
la raíz, leyendo `DATABASE_URL` de `apps/api/.env`:

```js
const { Pool } = require('./node_modules/pg');
const url = /DATABASE_URL="([^"]+)"/.exec(
  require('fs').readFileSync('apps/api/.env', 'utf8'),
)[1];
```

### Migraciones a mano

```bash
cd apps/api
npx prisma db execute --file prisma/migrations/<nombre>/migration.sql
npx prisma migrate resolve --applied <nombre>
```

`db execute` **no** acepta `--schema`. Si algo falla de forma rara, lo primero es
`npx prisma migrate status`: la base local se desincroniza con frecuencia, y una
columna faltante hace que el endpoint devuelva **500 para todos los usuarios**.

### Pruebas de extremo a extremo

El patrón que funciona aquí: sembrar filas en Postgres con `pg` (contraseñas con
`argon2`), conducir el navegador con el `puppeteer` ya instalado, y **borrar las
filas al final confirmando que quedan en cero**.

Trampas ya conocidas (todas costaron un intento fallido):

- Los títulos se pintan en mayúsculas por CSS y `innerText` refleja el
  `text-transform`.
- El panel tiene **dos `<aside>`**: `querySelector('aside')` coge el de
  navegación.
- Las rutas `/tmp` de Git Bash no las resuelve el `node` de Windows.
- Los heredoc largos con acentos a veces fallan en Git Bash: usa la herramienta
  de escritura de archivos.

---

## Detalles del dominio que se olvidan

### Permisos y roles

- Tabla puente de roles: **`"_RoleToUser"`** (`A` = rol, `B` = usuario).
  Permisos: **`"_PermissionToRole"`** (`A` = permiso, `B` = rol).
- Las rutas del panel clínico se controlan por slug `clinical.*`
  (`apps/web/src/lib/clinical-panel-permissions.ts`).
- `apps/web/src/proxy.ts` llama a `/auth/me/permissions` con `cache: "no-store"`
  en cada petición del panel: **un cambio de permisos aplica sin volver a
  iniciar sesión**.
- `patients.doctor_id` apunta a **`doctors.id`**, no a `users.id`.
- Los pacientes **solo entran desde la app móvil**; el panel de paciente del web
  está bloqueado en el proxy.

### Nombres de proveedor: qué slug es qué

**Las palabras `youcam`, `perfectcorp`, `perfect corp` y `skiniver` no pueden
aparecer en nada que descargue el navegador** — ni en un chunk, ni en una URL
del Network, ni en una clave de JSON, ni en pantalla. En el servidor sí: el
código del API no se descarga, y la base guarda los slugs internos.

| Interno (invisible) | Slug público | Qué es para el usuario |
|---|---|---|
| `skiniver` | `analisisdermapiel360` | Análisis Dermatológico Piel 360 |
| `youcam` | `analisispiel360` | Análisis Estético Piel 360 |
| `perfectcorp` (bolsa) | `analisispiel360` | bolsa Estética (estético + fototipo) |
| `fitzpatrick` | `fitzpatrick` | Análisis de Fototipo Piel 360 |

`fitzpatrick` **no se enmascara**: es una escala médica publicada, no un
proveedor. `perfectcorp` comparte slug público con `youcam` porque Perfect Corp
es el dueño de YouCam; la vuelta atrás sí es distinta, y por eso hay dos mapas
(`PROVIDER_PUBLIC_ALIASES` y `POOL_PUBLIC_ALIASES`).

Dónde vive cada pieza:

- `packages/shared/src/public-provider-slugs.ts` — **el único vocabulario que
  puede llegar al navegador**. Está separado a propósito: basta con que el web
  importe una función del otro módulo para que el bundler se traiga sus tablas
  internas y los nombres acaben en un chunk.
- `packages/shared/src/provider-public-alias.ts` — los mapas interno ↔ público
  y los helpers de enmascarado. **Solo lo usa el API** (y `proxy.ts`, que corre
  en el servidor).
- `apps/web/src/lib/analysis-provider-label.ts` — las etiquetas que se pintan.

La regla al añadir código:

- **El API enmascara al serializar**, nunca el navegador. Si una respuesta nueva
  lleva un slug o una clave de proveedor, pásala por `toPublicProviderSlug`,
  `toPublicPoolSlug` o `toPublicProviderKeys`. `toPublicPlanProviders` ya cubre
  los planes (slug, `name`, `analysisLimits`, `apiCosts`, `poolProvider`).
- **Y desenmascara al escribir**: el panel manda slugs públicos y las columnas
  guardan los internos (`toInternalProviderKeys`). Ojo con el `ValidationPipe`:
  una clave que no esté en el DTO devuelve **400**, así que los DTOs declaran la
  clave pública.
- Los **nombres de archivo no importan** (`youcam-report-view.tsx` sigue
  llamándose así): el build no publica source maps, comprobado. Lo que sí
  sobrevive a la minificación son los **símbolos exportados** y los literales.
- El **JWT guarda los permisos internos** porque los guards del API comparan
  contra ellos. `proxy.ts` los normaliza con `toPublicProviderPermissions` en el
  único punto por donde entran al web.

Dos excepciones, a propósito:

- **`POST /webhooks/youcam` no se toca**: esa URL está registrada en el
  dashboard del proveedor y cambiarla rompe la integración. No la ve el
  navegador.
- Las variables de entorno del API (`YOUCAM_*`, `SKINIVER_*`) y los nombres de
  columna (`youcam_task_id`) se quedan. El campo de Prisma se llama
  `analisisPiel360TaskId` con `@map("youcam_task_id")`, así que **la columna y
  los índices no cambiaron y no hubo migración**.

Lo que se sacó del panel y se anota aquí para no perderlo:

- Tarifario del proveedor estético: `https://yce.perfectcorp.com/ai-api/api-pricing`
  (estaba como botón «Recargar en Perfect Corp» en Bolsa de unidades).
- El contacto del proveedor dermatológico sigue en pantalla como
  `info@skinive.com`: no contiene ninguna de las palabras prohibidas.

Cómo comprobarlo — **no se razona, se ejecuta**:

```bash
pnpm turbo run build
pnpm run check:proveedores   # recorre .next/static y el HTML/RSC servido
```

Antes de este trabajo daba 886 ocurrencias en 51 chunks; tiene que dar 0. El
grep estático no ve lo que el API responde en caliente: para eso hay un guion
de puppeteer que recorre el panel apuntando cada URL y cada cuerpo de respuesta.

**El atlas trae el `<head>` del proveedor**: los artículos se guardan
scrapeados, y el HTML incluía su JSON-LD y sus `<meta>` —con su marca y sus
redes— además de meter el `<script>` de un tercero en nuestra página. El
scraper ya los quita (`REMOVE_SELECTORS` en `encyclopedia.service.ts`), pero
**eso solo afecta a lo que se baje a partir de ahora**: las filas que ya están
guardadas siguen igual hasta que se vuelvan a scrapear. Para limpiarlas se
fuerza el sync, que es idempotente y no toca SQL:

```bash
curl -X POST https://<api>/api/encyclopedia/sync -H "Authorization: Bearer <token>"
```

Requiere el permiso `update_encyclopedia_entry`. Si no, se limpian solas en el
`@Cron` mensual. **No se arregla con una migración**: reescribir el HTML a
golpe de `regexp_replace` se llevó por delante el cuerpo de los 46 artículos en
local —en Postgres, si el primer cuantificador de la expresión es greedy, toda
la expresión lo es, así que `<script[^>]*>.*?</script>` borra desde el primer
`<script>` hasta el último—.

**Nombres en los datos**: `plans.name` no se enmascara —lo escribe el negocio—
así que un plan llamado «Skiniver Básico» se pinta tal cual. Los seeds ya usan
«Dermatológico Básico» / «Estético Básico»; **en producción hay que revisarlo a
mano** con `select id, name from plans where name ~* 'skiniver|youcam|perfect'`.

### Análisis dermatológico (el proveedor interno `skiniver`)

- `/predict` recibe `lang` desde `users.diagnostic_language`, pero **solo traduce
  `description`**: `risk`, `class` y `desease` llegan siempre en el idioma
  original. Para traducir se usan `skiniverRiskLabel`, `skiniverDiagnosisLabel` y
  `skiniverCategoryLabel`, nunca el texto crudo.
- Anclas que no dependen del idioma: `topn[].risk_level` (`low|medium|high`) y
  `topn[].class_raw` (ej. `2A_acne_pustular`).
- **Cada `topn[]` trae su propio `description` completo**, con evaluación,
  diagnóstico preciso, tratamiento y consejo concatenados. No se hereda el del
  principal.
- `Diagnóstico preciso` **no es el nombre de una enfermedad**: es cómo se llegaría
  al diagnóstico definitivo ("después de la dermatoscopia"). No sirve para decidir
  a qué candidato pertenece un texto.
- Si Skiniver falla, la excepción salta **antes** de crear el análisis: no queda
  fila en `analyses` y **no se consume crédito**. Los logs son la única evidencia.
  Busca `POST /analyses falló` y `Skiniver /predict`.
- **Los reportes cuentan el diagnóstico del profesional**, no siempre el de la
  IA. Al confirmar o corregir se guardan `final_diagnosis_code` (el
  `class_raw`) y `final_diagnosis_category` (el grupo, con el nombre de la
  categoría de la IA); `apps/api/src/analyses/final-diagnosis.ts` los resuelve
  por código (web) o por nombre (móvil). Nulos = cuenta el de la IA. Las
  queries usan `DIAGNOSIS`/`CATEGORY`/`CLASS_RAW` de
  `skiniver-reports.queries.ts`: no vuelvas a leer `ai_diagnosis` a pelo.
  Las correcciones guardadas antes de esas columnas se rellenan solas al
  arrancar el API (`analyses/final-diagnosis-backfill.ts`); el log dice
  cuántas («Relleno de diagnósticos corregidos»).
- **Los nombres del JSON engañan: `desease` es la CLASE y `class` es la ENFERMEDAD.**
  Comprobado contra `GET /get_disease_classes?lang=es` (Basic con `SKINIVER_API_TOKEN`):
  `desease` coincide siempre con un `title_name` y `class` con un `diseases[].name`.
  Las clases de los reportes son las de ese endpoint, con su nombre oficial;
  `analisisDermaPiel360ClassLabel` las resuelve por `class_raw` primero.
  «Piel Sin Patología» cuenta como una clase más en todos los gráficos (lo pidió el cliente).
- La lista de «Corregir resultado» es `packages/shared/src/nosology-catalog.ts`;
  el móvil tiene su espejo en `views/nosologies/data/nosologies.ts`.

### Planes y créditos

- **Un profesional puede tener varios planes activos del mismo análisis.**
  Comprar uno nuevo ya no cancela los anteriores (lo pidió el cliente: si le
  quedan créditos, siguen activos). Se descuenta primero del que **vence
  antes** (`SubscriptionCreditsService.findActiveForUser`).
- Los que se cancelaron antes del arreglo se reactivan solos al arrancar el
  API (`subscriptions/overlap-cancel-restore.ts`); el log dice cuántos
  («Planes reactivados»). Se detectan por el `updated_at` del plan cancelado
  junto a la «Activación» del nuevo: el movimiento «Cancelación» no siempre
  quedó registrado.
- **Un plan vencido sigue en `active`**: nada lo cambia. Quien cuente créditos
  usables tiene que filtrar por fecha (`resolveSubscriptionEndsAt`), como
  hacen `findActiveForUser` y `analyses/analysis-consumption.service.ts`.

### Fechas de los reportes

Los filtros «desde/hasta» son **días de Colombia**, no UTC:
`apps/api/src/doctor-reports/report-range.ts` (`resolveReportRange`) y
`colombiaDateKey`/`colombiaDayStart` de `packages/shared/src/colombia-date.ts`.
Antes «del 10/10 al 10/10» iba del 9/10 a las 19:00 al 10/10 a las 19:00 de
Bogotá. Las series mensuales del reporte dermatológico agrupan por mes de
Colombia; la tendencia del reporte estético (`doctor-reports.queries.ts`)
todavía agrupa por mes UTC.

### Front

- **ESLint marca `react-hooks/set-state-in-effect` como error**: deriva el estado
  con `useMemo`, no lo sincronices en un efecto.
- Cuidado con los contextos de apilamiento: `location-picker-section.tsx` usa
  `z-[1100]`, así que un desplegable hermano necesita más.

---

## Estado actual (actualizar cuando cambie)

- Rama de trabajo: `feature/correos-moderacion`.
- Pendiente de despliegue: reconstruir la imagen del API (cambió
  `packages/shared`) y confirmar con `npx prisma migrate status` que producción
  está al día.
- Los banners de las plantillas de correo se sirven por
  `/api/public/email-assets/<key>`, que redirige a una firma nueva: la URL
  firmada que se guardaba antes caducaba a los 7 días. Esa ruta y el link del
  reporte se arman con **`PUBLIC_API_URL`** (dominio público del API, sin
  `/api`): comprobar que está bien en `/opt/piel360/.env.production`.
- **El web y el API tienen que desplegarse juntos**: cambiaron las rutas
  (`/api/analisispiel360/*`, `/api/analisisdermapiel360/*`,
  `/api/admin/bolsa-unidades/analisis*`) y un web viejo contra un API nuevo
  pediría URLs que ya no existen.
- `apps/mobile` sigue nombrando a los proveedores en sus espejos
  (`youcamScoreConfig.ts`, `analysisProviderLabel.ts`, vistas `Youcam*` /
  `Skiniver*`). No se rompe —el móvil no importa `@piel360/shared`— pero queda
  desalineado: es una entrega aparte.
