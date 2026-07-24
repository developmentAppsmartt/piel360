# Se construye con contexto en la raíz del repo (pnpm workspace) — ver
# railway.json (`build.dockerfilePath`). Imagen única (no multi-stage): más
# simple y determinista que dejar que Railpack adivine qué artefactos
# promover entre la imagen de build y la de runtime — eso fue justo lo que
# falló (build ok, pero `apps/api/dist/main` no existía en el contenedor de
# arranque).
FROM node:22.13-bookworm-slim

# Prisma necesita openssl para sus motores de consulta.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# No usar `corepack enable` — corepack intenta verificar la firma del paquete
# pnpm contra el registro de npm al resolver la versión, y con la imagen base
# actual esa verificación falla ("Cannot find matching keyid", clave de firma
# desactualizada en el corepack embebido). Instalar pnpm directo evita ese paso.
RUN npm install -g pnpm@11.3.0

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @piel360/shared run build
RUN pnpm --filter @piel360/api run build

WORKDIR /app/apps/api

CMD ["sh", "-c", "pnpm run migrate:deploy && pnpm run start:prod"]
