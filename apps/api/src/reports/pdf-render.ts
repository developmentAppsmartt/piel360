import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

/** Piezas comunes de los PDF del API: el reporte de un análisis y los
 * reportes comparativos. */

export const BRAND_PRIMARY = '#1e5a9e';
export const BRAND_DARK = '#0f3d73';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatStamp(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

function loadLogoDataUri(candidates: string[], mime: string): string | null {
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      const base64 = readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch {
      // siguiente candidato
    }
  }
  return null;
}

/** Logo de cabecera y de pie, como data URI (null si no se encuentran). */
export function brandLogos(): { header: string | null; footer: string | null } {
  const cwd = process.cwd();
  const headerLogo = loadLogoDataUri(
    [
      join(cwd, 'apps/mobile/assets/logo-headers.png'),
      join(cwd, '../mobile/assets/logo-headers.png'),
      join(cwd, '../../apps/mobile/assets/logo-headers.png'),
    ],
    'image/png',
  );
  const footerLogo = loadLogoDataUri(
    [
      join(cwd, 'apps/web/public/logo-piel360.png'),
      join(cwd, '../web/public/logo-piel360.png'),
      join(cwd, '../../apps/web/public/logo-piel360.png'),
    ],
    'image/png',
  );
  return { header: headerLogo, footer: footerLogo };
}

export async function htmlToPdf(
  html: string,
  { singlePage = false }: { singlePage?: boolean } = {},
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // En Docker `/dev/shm` son 64 MB por defecto y Chromium se cae solo al
      // renderizar paginas con imagenes — justo este reporte, que embebe el
      // logo y la foto del paciente en base64.
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      // El reporte del análisis es una sola hoja por diseño; los comparativos
      // pueden pasar a una segunda si hay muchas notas.
      ...(singlePage ? { pageRanges: '1' } : {}),
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
