# Se construye con contexto en la raíz del repo (pnpm workspace) — ver
# railway.json (`build.dockerfilePath`). Imagen única (no multi-stage): más
# simple y determinista que dejar que Railpack adivine qué artefactos
# promover entre la imagen de build y la de runtime — eso fue justo lo que
# falló (build ok, pero `apps/api/dist/main` no existía en el contenedor de
# arranque).
FROM node:22.13-bookworm-slim

# Prisma necesita openssl para sus motores de consulta. El resto son las
# librerías que necesita el Chromium de Puppeteer para correr — sin esto el
# PDF del reporte (apps/api/src/reports/report-pdf.service.ts) falla en
# runtime con un error de librerías compartidas faltantes, aunque el build
# termine bien (la imagen base es Debian slim, no las trae).
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcairo2 libcups2 libdbus-1-3 libexpat1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libxss1 libxtst6 wget xdg-utils \
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
