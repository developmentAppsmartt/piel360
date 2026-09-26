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
#
# `unzip` no es opcional: puppeteer descarga Chromium como .zip y sin un
# descompresor falla con "no zip archiver is available", dejando la carpeta
# creada pero vacia. El build seguia pasando y el fallo aparecia solo en
# produccion, como "Could not find Chrome" al pedir el PDF del reporte.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl unzip \
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

# Ruta fija para el navegador de Puppeteer. Por defecto usa
# `$HOME/.cache/puppeteer`, que depende del usuario que haga el build y del que
# corra el contenedor; fijarla evita que el binario quede en un sitio y se
# busque en otro.
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

RUN pnpm install --frozen-lockfile

# Chromium se instala de forma explicita y no confiando en el postinstall de
# puppeteer: ese script deja la carpeta creada pero sin el ejecutable cuando la
# descarga no termina, y entonces puppeteer se niega a reinstalar ("An earlier
# install of this build probably did not finish"). Ese era justo el estado de la
# imagen en produccion: el PDF fallaba con "Could not find Chrome".
RUN rm -rf "$PUPPETEER_CACHE_DIR" && pnpm --filter @piel360/api exec puppeteer browsers install chrome
# Red de seguridad: si el binario no quedo instalado, el build falla aqui en
# vez de arrancar un contenedor que devuelve error al generar el PDF.
RUN node -e "const p=require('/app/node_modules/puppeteer'); const fs=require('node:fs'); const x=p.executablePath(); if(!fs.existsSync(x)) throw new Error('Chromium no quedo instalado en '+x); console.log('Chromium OK:', x);"

RUN pnpm --filter @piel360/shared run build
RUN pnpm --filter @piel360/api run build

WORKDIR /app/apps/api

CMD ["sh", "-c", "pnpm run migrate:deploy && pnpm run start:prod"]
