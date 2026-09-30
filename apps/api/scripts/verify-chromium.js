/**
 * Verifica, durante el build de la imagen, que Chromium quedó instalado y que
 * arranca de verdad. Sin esto el fallo no se nota hasta produccion, al pedir el
 * PDF del reporte (apps/api/src/reports/report-pdf.service.ts), y se manifiesta
 * como un error generico al descargar.
 *
 * Cubre los dos modos de fallo que ya se dieron en esta imagen:
 *  1. El binario no se instala — faltaba `unzip` y puppeteer no podia
 *     descomprimir el .zip de Chromium, dejando la carpeta vacia.
 *  2. El binario existe pero no arranca — falta alguna libreria del sistema.
 */
const fs = require('node:fs');

(async () => {
  const mod = require('puppeteer');
  // Segun como se resuelva el paquete (CJS o ESM via require), la instancia de
  // puppeteer puede venir en `.default`; y `executablePath()` puede ser sync o
  // devolver una promesa. `await` funciona en ambos casos.
  const puppeteer = mod.default ?? mod;
  const executablePath = await puppeteer.executablePath();

  if (typeof executablePath !== 'string' || !fs.existsSync(executablePath)) {
    throw new Error(`Chromium no quedo instalado (ruta: ${executablePath})`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  const version = await browser.version();
  await browser.close();

  console.log(`Chromium OK: ${version} en ${executablePath}`);
})().catch((error) => {
  console.error(`FALLO la verificacion de Chromium: ${error.message}`);
  process.exit(1);
});
