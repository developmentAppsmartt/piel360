# Piel360 — Monorepo

Plataforma de gestión y diagnóstico dermatológico asistido por IA. Este repositorio es la **reconstrucción** del sistema Laravel/Filament original (`Piel360/`, carpeta hermana, repo aparte) sobre un stack TypeScript: **NestJS + Prisma** (API), **Next.js** (web) y **Expo/React Native** (móvil), en un monorepo pnpm + Turborepo.

> El sistema Laravel original sigue siendo la **producción vigente** hasta que este monorepo lo reemplace (cutover planeado, ver [`Piel360/PLAN-MIGRACION.md`](Piel360/PLAN-MIGRACION.md)). Este repo se está construyendo desde cero junto a él, no reemplazándolo todavía.

---

## Índice

- [Qué es Piel360](#qué-es-piel360)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [Stack técnico](#stack-técnico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Requisitos previos](#requisitos-previos)
- [Cómo levantar el proyecto](#cómo-levantar-el-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Comandos por app](#comandos-por-app)
- [Particularidades importantes](#particularidades-importantes-leer-antes-de-tocar-dependencias)
- [Documentación de referencia](#documentación-de-referencia)

---

## Qué es Piel360

Piel360 tiene **tres roles/paneles** (admin, doctor, paciente) y dos integraciones de IA dermatológica:

- **Skiniver** — diagnóstico de lesiones de piel por imagen (síncrono: validación de calidad + predicción con `topn` de diagnósticos diferenciales + nivel de riesgo).
- **YouCam (Perfect Corp)** — análisis facial de estado de piel (asíncrono: 16 métricas HD, task + webhook con verificación estilo Svix).

Además: suscripciones y pagos vía **Wompi** (Colombia), login social con **Google OAuth**, geolocalización de doctores con **Google Maps**, y una enciclopedia dermatológica scrapeada y cacheada.

El detalle completo de cada endpoint, integración y regla de negocio del sistema original está documentado en `Piel360/MIGRACION.md` e `Piel360/INTEGRACIONES-IA.md` (ver [Documentación de referencia](#documentación-de-referencia)).

## Estado actual del proyecto

🚧 **En construcción activa, no apto para producción todavía.**

| App | Estado |
|---|---|
| `apps/api` (NestJS + Prisma) | Scaffold funcional: 12 módulos de dominio, Prisma con los 12 modelos del sistema legado, auth/health/etc. **sin lógica de negocio implementada** (services vacíos) |
| `apps/web` (Next.js) | Scaffold funcional: 13 rutas (landings, auth, paneles) como placeholders, protección de rutas por rol ya funcionando, **sin UI/contenido real** |
| `apps/mobile` (Expo/React Native) | Scaffold mínimo (blank TypeScript template), **sin pantallas ni dependencias propias todavía** |
| Base de datos | Sin Postgres real corriendo — `prisma migrate`/seed no se han ejecutado contra una BD real |
| CI/CD | No configurado — nada desplegado a Railway/Vercel/EAS todavía |

Ver `Piel360/PLAN-MIGRACION.md` (cronograma) y `Piel360/PLAN-SETUP-MONOREPO.md` (registro detallado de lo ejecutado, sesión por sesión, con los problemas encontrados y cómo se resolvieron) para el estado exacto y los próximos pasos.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 11 + Prisma 7 (PostgreSQL) + BullMQ/Redis (colas, pendiente de conectar) |
| Web | Next.js 16 (App Router, Turbopack) + Tailwind CSS v4 + shadcn/ui + TanStack Query |
| Móvil | Expo (SDK 57) + React Native 0.86 |
| Compartido | `@piel360/shared` — tipos/DTOs/enums/constantes usados por las tres apps |
| Monorepo | pnpm workspaces (`node-linker: hoisted`) + Turborepo |
| Auth (diseño) | JWT (access + refresh) verificado con `jose` en Next.js y con Passport en NestJS |
| Deploy (planeado) | Railway (API + Postgres + Redis), Vercel (web), EAS (móvil) |

## Estructura del monorepo

```
piel360/
├── Piel360/              # Sistema Laravel/Filament ORIGINAL — repo git propio,
│                         #   NO versionado por este repo (ver .gitignore). Es la
│                         #   fuente de verdad del comportamiento a migrar y contiene
│                         #   toda la documentación de análisis (MIGRACION.md, etc.)
├── apps/
│   ├── api/              # NestJS + Prisma → Railway
│   ├── web/              # Next.js (App Router) → Vercel
│   └── mobile/           # Expo + React Native → EAS
├── packages/
│   ├── shared/           # Tipos Skiniver/YouCam, enums, constantes compartidas
│   └── config/           # tsconfig base + config ESLint compartida
├── pnpm-workspace.yaml    # packages, nodeLinker, allowBuilds, overrides (ver abajo)
├── turbo.json
└── package.json           # scripts raíz: dev/build/lint/typecheck/test (vía turbo)
```

## Requisitos previos

- **Node.js ≥ 20** (probado con v22.16.0)
- **pnpm ≥ 11** (`corepack enable` o `npm i -g pnpm`; el repo fija `packageManager: pnpm@11.3.0`)
- **PostgreSQL** corriendo localmente (o Docker) para trabajar en `apps/api` — no incluido en este repo
- **Redis** corriendo localmente (o Docker) — **obligatorio para levantar `apps/api`**, no opcional: los flujos de análisis (Skiniver/YouCam) encolan jobs con BullMQ (`analysisImagesQueue`/`encyclopediaQueue`/etc.) al crear un análisis, y esas llamadas a la cola **no están envueltas en try/catch** (a diferencia de la subida a S3, que sí degrada con gracia) — sin Redis, `POST /analyses` y `POST /youcam/analyses` responden `500 Internal server error` en vez de crear el análisis
- Para `apps/mobile`: [Expo Go](https://expo.dev/go) en el teléfono, o un emulador Android/iOS configurado

## Cómo levantar el proyecto

### 1. Clonar e instalar

```bash
cd piel360
pnpm install
```

Esto instala las dependencias de las 5 apps/packages del workspace. El `postinstall` de `apps/api` corre automáticamente `prisma generate` (necesario porque el cliente Prisma se genera dentro de `node_modules` y no queda versionado).

### 2. Base de datos y Redis (para trabajar en `apps/api`)

```bash
# Levantar un Postgres local, por ejemplo con Docker:
docker run --name piel360-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=piel360 -p 5432:5432 -d postgres:16

# Levantar Redis (obligatorio — ver nota en "Requisitos previos"):
docker run --name piel360-redis -p 6379:6379 -d redis:7-alpine

# Copiar el .env de ejemplo si no existe (ya viene con un DATABASE_URL/REDIS_URL local por defecto)
# apps/api/.env ya está creado con valores de desarrollo — revisar antes de usar

cd apps/api
pnpm exec prisma migrate dev    # crea las tablas
pnpm exec prisma db seed        # providers (skiniver/youcam), roles, permisos, planes, admin
```

Los `docker run` de arriba son **solo la primera vez** (crean los contenedores). Si Docker Desktop se reinició o los contenedores quedaron detenidos, en cada sesión de trabajo alcanza con:

```bash
docker start piel360-db piel360-redis
```

(`docker ps -a` para ver el estado de ambos contenedores si algo no conecta).

### 3. Levantar las apps

```bash
# Desde la raíz — todo el workspace en paralelo (vía Turborepo):
pnpm dev

# O una app a la vez:
pnpm --filter @piel360/api run start:dev     # http://localhost:3000  (Swagger en /docs)
pnpm --filter @piel360/web run dev           # http://localhost:3001
pnpm --filter @piel360/mobile run start      # Expo Dev Server (QR para Expo Go)
```

### 4. Verificar que todo compila

```bash
pnpm turbo run build     # compila shared, api y web
pnpm turbo run lint       # eslint en todas las apps
```

## Variables de entorno

Cada app tiene su propio archivo de entorno (no hay un `.env` compartido en la raíz):

| Archivo | Notas |
|---|---|
| `apps/api/.env` | Ya existe con valores de desarrollo. Incluye `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`/`JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, credenciales de Google/YouCam/Skiniver/S3 (vacías, llenar según se necesiten) |
| `apps/web/.env.local.example` | Copiar a `.env.local`. **`JWT_SECRET` debe ser idéntico al de `apps/api/.env`** — el proxy de Next.js (`src/proxy.ts`) verifica ahí la firma de los tokens que emite la API |

En producción (Railway/Vercel) estas se configuran como variables de entorno del servicio, no como archivos.

## Comandos por app

### `apps/api` (NestJS)

```bash
pnpm --filter @piel360/api run start:dev   # dev con watch
pnpm --filter @piel360/api run build        # nest build
pnpm --filter @piel360/api run lint
pnpm --filter @piel360/api exec prisma studio        # explorar la BD visualmente
pnpm --filter @piel360/api exec prisma migrate dev   # nueva migración tras editar schema.prisma
```

Swagger disponible en `http://localhost:3000/docs`. Health check en `http://localhost:3000/health` (fuera del prefijo `/api`, para que Railway pueda pegarle directo).

### `apps/web` (Next.js)

```bash
pnpm --filter @piel360/web run dev     # puerto 3001 (fijo, para no chocar con la API en 3000)
pnpm --filter @piel360/web run build
pnpm --filter @piel360/web run lint
```

### `apps/mobile` (Expo)

```bash
pnpm --filter @piel360/mobile run start     # Expo Dev Server
pnpm --filter @piel360/mobile run android
pnpm --filter @piel360/mobile run ios
```

### `packages/shared`

```bash
pnpm --filter @piel360/shared run build     # tsup → dist/ (cjs + esm + .d.ts)
pnpm --filter @piel360/shared run dev        # watch mode
```

Cualquier cambio en `packages/shared` requiere `run build` para que `apps/api`/`apps/web` vean los cambios (a menos que corras `pnpm --filter @piel360/shared run dev` en paralelo).

## Particularidades importantes (leer antes de tocar dependencias)

Este proyecto usa una versión reciente de pnpm (11.3.0) donde **varios ajustes que normalmente van en `.npmrc` se movieron a `pnpm-workspace.yaml`**. Si algo de esto no aplica, es la primera causa a revisar:

1. **`node-linker: hoisted` vive en `pnpm-workspace.yaml`, no en `.npmrc`.** Es obligatorio por Expo/Metro (no resuelve bien los symlinks del modo `isolated` por defecto de pnpm). Un `.npmrc` con `node-linker=hoisted` **no tiene ningún efecto** en esta versión.

2. **`overrides` también vive en `pnpm-workspace.yaml`** (no en `package.json` → `pnpm.overrides`, que esta versión ignora silenciosamente). Hoy fuerza dos cosas:
   - `eslint` a una sola versión en todo el árbol (una copia anidada de `eslint@10` rompía el lint con un error de `ajv`).
   - `react`/`react-dom` a `19.2.3` en todo el árbol (Expo/React Native exige esa versión exacta; Next.js es más flexible, así que se alineó `apps/web` a la de Expo, no al revés).

3. **`auto-install-peers=false` en `.npmrc`.** Se desactivó a propósito: con `true`, pnpm auto-instalaba una copia **anidada** de `eslint@10` dentro de `@typescript-eslint/utils` (con un `ajv` incompatible) en paralelo al `eslint@9` hoisted en la raíz. Si vuelves a activarlo, probablemente reaparezca ese error de lint.

4. **`allowBuilds` en `pnpm-workspace.yaml` aprueba explícitamente los build scripts nativos necesarios** (`argon2`, `esbuild`, `msgpackr-extract`, `unrs-resolver`, `@prisma/engines`, `prisma`, `sharp`) y **rechaza `@scarf/scarf`** (telemetría de instalación de `swagger-ui-dist`, sin utilidad para el proyecto). Si agregas una dependencia nueva con postinstall nativo, pnpm te lo va a pedir explícitamente (`pnpm approve-builds`) — revisa qué es antes de aprobarlo a ciegas.

5. **Prisma 7 cambió cómo se conecta el cliente.** El `schema.prisma` **no** acepta `url` en el `datasource` (error de validación si lo intentas). La conexión se pasa como *driver adapter* (`@prisma/adapter-pg`) al construir `PrismaClient` — ver `apps/api/src/prisma/prisma.service.ts`. El generador se mantuvo en `provider = "prisma-client-js"` (el default nuevo de Prisma 7, `prisma-client`, usa un output distinto y rompería el patrón `import { PrismaClient } from '@prisma/client'` que se usa en todo el proyecto).

6. **El cliente Prisma generado no está versionado** (vive en `node_modules/@prisma/client`, gitignored). `apps/api/package.json` tiene `"postinstall": "prisma generate"` para que esto sea automático — si ves errores tipo `Module '"@prisma/client"' has no exported member 'PrismaClient'`, corré `pnpm --filter @piel360/api exec prisma generate` a mano.

7. **Next.js 16 renombró `middleware.ts` a `proxy.ts`.** El archivo de protección de rutas por rol está en `apps/web/src/proxy.ts` (exporta `proxy`, no `middleware`) — es la convención nueva, no una rareza del proyecto.

8. **La estructura de rutas de `apps/web` NO usa un grupo `(public)` separado para las landings de doctor/paciente.** Se intentó así originalmente pero genera un conflicto real: dos carpetas distintas (`(public)/doctor/` y `doctor/`) resolviendo a la misma URL `/doctor`, que Next.js rechaza. La landing pública y el panel autenticado de cada rol viven en la **misma carpeta** (`app/doctor/`), con el panel autenticado dentro de un subgrupo `app/doctor/(panel)/` que no agrega segmento a la URL. La protección de rutas en `src/proxy.ts` funciona por **lista de rutas públicas excluidas**, no por segmento de carpeta (porque `(panel)` no existe en la URL).

9. **`create-next-app`/`create-expo-app` pueden generar workspaces pnpm anidados si no detectan el monorepo.** Si vuelves a scaffoldear una app nueva dentro de `apps/`, revisa que no haya quedado un `pnpm-workspace.yaml`/`pnpm-lock.yaml`/`node_modules` propio dentro de esa carpeta — hay que borrarlos y correr `pnpm install` desde la raíz.

10. **`apps/web/.next/` puede quedar en un estado inconsistente si alternás `next dev` y `next build` sin limpiar.** Si el build falla con algo como `File '.next/dev/types/routes.d.ts' is not a module`, simplemente `rm -rf apps/web/.next` y volvé a compilar — es un comportamiento normal de Turbopack, no un bug del monorepo.

## Documentación de referencia

Toda la documentación de análisis y planificación de la migración vive en el repo del sistema Laravel original (carpeta hermana, no versionada por este repo):

- [`Piel360/MIGRACION.md`](Piel360/MIGRACION.md) — mapeo completo de endpoints, base de datos, lógica de negocio y arquitectura del sistema original, con su equivalente propuesto en el nuevo stack.
- [`Piel360/INTEGRACIONES-IA.md`](Piel360/INTEGRACIONES-IA.md) — detalle técnico de las integraciones con Skiniver y YouCam (requests, responses, cómo se consumen y se muestran).
- [`Piel360/PLAN-MIGRACION.md`](Piel360/PLAN-MIGRACION.md) — cronograma de migración por semanas, hitos y riesgos.
- [`Piel360/PLAN-SETUP-MONOREPO.md`](Piel360/PLAN-SETUP-MONOREPO.md) — registro detallado, sesión por sesión, de la construcción de este monorepo: qué se ejecutó, qué problemas aparecieron y cómo se resolvieron (complementa la sección de particularidades de arriba con el contexto completo de cada hallazgo).
