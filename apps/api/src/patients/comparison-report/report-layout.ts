import {
  BRAND_DARK,
  BRAND_PRIMARY,
  brandLogos,
  escapeHtml,
} from '../../reports/pdf-render';

/** Piezas comunes de los dos PDF comparativos (estético y dermatológico). */

export interface ReportPhoto {
  /** data URI de la foto ya achicada; null si el análisis no la guardó. */
  dataUri: string | null;
  date: string;
}

export interface ReportPatientInfo {
  name: string;
  document: string | null;
  age: number | null;
  gender: string | null;
  clinic: string;
}

export const COMPARISON_REPORT_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #1A1A1A; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 10mm 11mm 8mm; display: flex; flex-direction: column; gap: 9px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .logo { height: 40px; width: auto; max-width: 170px; object-fit: contain; }
  .logo-text { font-size: 20px; font-weight: 800; color: ${BRAND_DARK}; }
  .facts { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 9px; color: #334155; justify-content: flex-end; }
  .facts b { display: block; color: ${BRAND_DARK}; font-size: 9.5px; }
  .band { border-radius: 10px; padding: 9px 12px; color: #fff; text-align: center;
    background: linear-gradient(90deg, ${BRAND_DARK}, ${BRAND_PRIMARY} 55%, #2f86d6); }
  .band h1 { margin: 0; font-size: 17px; letter-spacing: 0.2px; }
  .band p { margin: 2px 0 0; font-size: 10px; opacity: 0.9; font-style: italic; }
  .card { border: 1px solid #DCE6F2; border-radius: 10px; overflow: hidden; background: #fff; }
  .card h2 { margin: 0; padding: 6px 10px; font-size: 10.5px; color: #fff; background: ${BRAND_PRIMARY}; }
  .card .body { padding: 8px 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photo { text-align: center; font-size: 8.5px; color: #475569; }
  .photo img, .photo .empty { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; background: #F1F5F9; display: block; }
  .photo .empty { display: flex; align-items: center; justify-content: center; color: #94A3B8; }
  .photo .cap { margin-top: 3px; }
  .photo .cap b { color: ${BRAND_DARK}; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 3px 5px; border-bottom: 1px solid #EEF2F7; font-size: 8.5px; vertical-align: middle; }
  th { color: ${BRAND_DARK}; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
  td.num { font-weight: 700; text-align: center; }
  tr.zone td:first-child { padding-left: 16px; color: #475569; }
  .up { color: #047857; } .down { color: #B91C1C; } .same { color: #64748B; }
  .text { font-size: 9.5px; line-height: 1.45; white-space: pre-line; margin: 0; }
  ul.recs { margin: 0; padding-left: 15px; font-size: 9.5px; line-height: 1.45; }
  footer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    border-top: 2px solid ${BRAND_PRIMARY}; padding-top: 6px; font-size: 8.5px; color: #64748B; }
  footer .slogan { color: ${BRAND_DARK}; font-weight: 700; font-style: italic; }
  footer img { height: 26px; width: auto; }
  .avoid { break-inside: avoid; }
`;

export function htmlDocument(body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><style>${COMPARISON_REPORT_CSS}</style></head><body><div class="page">${body}</div></body></html>`;
}

/** Logo a la izquierda y los datos clave a la derecha. */
export function reportTop(facts: { label: string; value: string }[]): string {
  // El logo de color: el de cabecera es blanco (para el fondo azul del
  // reporte del análisis) y sobre blanco no se veía.
  const { footer } = brandLogos();
  const logo = footer
    ? `<img class="logo" src="${footer}" alt="PIEL 360" />`
    : `<span class="logo-text">PIEL 360</span>`;
  const items = facts
    .map(
      (f) => `<div><b>${escapeHtml(f.label)}</b>${escapeHtml(f.value)}</div>`,
    )
    .join('');
  return `<div class="top">${logo}<div class="facts">${items}</div></div>`;
}

export function reportBand(title: string, subtitle: string): string {
  return `<div class="band"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>`;
}

export function reportPhoto(
  photo: ReportPhoto,
  label: string,
  height = 150,
): string {
  const img = photo.dataUri
    ? `<img src="${photo.dataUri}" alt="${escapeHtml(label)}" style="height:${height}px" />`
    : `<div class="empty" style="height:${height}px">Sin imagen</div>`;
  return `<div class="photo">${img}<div class="cap"><b>${escapeHtml(label)}</b> · ${escapeHtml(photo.date)}</div></div>`;
}

export function reportCard(
  title: string,
  body: string,
  extraClass = '',
): string {
  return `<section class="card avoid ${extraClass}"><h2>${escapeHtml(title)}</h2><div class="body">${body}</div></section>`;
}

export function reportFooter(generatedAt: string): string {
  const { footer } = brandLogos();
  const logo = footer
    ? `<img src="${footer}" alt="PIEL 360" />`
    : '<b>PIEL 360</b>';
  return `<footer>${logo}<span class="slogan">Cuida tu piel, vive mejor.</span><span>Generado el ${escapeHtml(generatedAt)}</span></footer>`;
}

/** Anillo de puntaje (0–100) en SVG, como los de la pantalla. */
export function scoreRing(score: number | null, caption: string): string {
  const value =
    score == null ? null : Math.max(0, Math.min(100, Math.round(score)));
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = value == null ? 0 : (c * value) / 100;
  return `<div style="text-align:center">
    <svg width="78" height="78" viewBox="0 0 78 78">
      <circle cx="39" cy="39" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="7" />
      <circle cx="39" cy="39" r="${r}" fill="none" stroke="#10B981" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${dash} ${c}" transform="rotate(-90 39 39)" />
      <text x="39" y="40" text-anchor="middle" font-size="18" font-weight="800" fill="${BRAND_DARK}">${value ?? '—'}</text>
      <text x="39" y="53" text-anchor="middle" font-size="7" fill="#64748B">/100</text>
    </svg>
    <div style="font-size:9px;color:#475569">${escapeHtml(caption)}</div>
  </div>`;
}
