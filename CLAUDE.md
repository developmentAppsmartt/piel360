# Piel 360

Plataforma de dermatología con IA. Monorepo pnpm + Turborepo.

**Toda la comunicación con el usuario es en español.** El código, los nombres de
variables y los commits también van en español, siguiendo lo que ya hay.

---

## Cómo trabajar en este repo

Estas reglas van primero porque aplican a cada cambio, no solo a los grandes.

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

### Skiniver (análisis dermatológico)

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
