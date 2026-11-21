import type { ComparisonCategoryRow } from '@piel360/shared';
import { BRAND_PRIMARY, escapeHtml } from '../../reports/pdf-render';
import {
  htmlDocument,
  reportBand,
  reportCard,
  reportFooter,
  reportPhoto,
  reportTop,
  scoreRing,
  type ReportPatientInfo,
  type ReportPhoto,
} from './report-layout';

export interface AestheticReportData {
  patient: ReportPatientInfo;
  initial: ReportPhoto & { overall: number | null };
  current: ReportPhoto & { overall: number | null };
  rows: ComparisonCategoryRow[];
  /** Nota general del profesional; vacía = resumen automático. */
  generalNote: string;
  categoryNotes: Record<string, string>;
  generatedAt: string;
}

function trendClass(delta: number): string {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'same';
}

function signed(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}`;
}

/** «Puntaje general de A a B (±N). Mejoraron X…» cuando no hay nota. */
export function automaticConclusion(data: AestheticReportData): string {
  const main = data.rows.filter((r) => !r.parentId);
  const up = main.filter((r) => r.improvement > 0).length;
  const same = main.filter((r) => r.improvement === 0).length;
  const down = main.filter((r) => r.improvement < 0).length;
  const a =
    data.initial.overall == null ? null : Math.round(data.initial.overall);
  const b =
    data.current.overall == null ? null : Math.round(data.current.overall);
  const overall =
    a != null && b != null
      ? `El puntaje general pasó de ${a} a ${b} (${signed(b - a)} puntos). `
      : '';
  return `${overall}Mejoraron ${up} categorías, se mantuvieron ${same} y bajaron ${down}.`;
}

/** Las 3 categorías con menor puntaje actual, más las notas por categoría. */
export function recommendations(data: AestheticReportData): string[] {
  const main = data.rows.filter((r) => !r.parentId);
  const lowest = [...main]
    .sort((x, y) => x.currentScore - y.currentScore)
    .slice(0, 3)
    .map((r) => `${r.label} (${r.currentScore}/100)`);
  const items = lowest.length
    ? [`Prioriza el cuidado en: ${lowest.join(', ')}.`]
    : [];
  for (const row of data.rows) {
    const note = data.categoryNotes[row.id]?.trim();
    if (!note) continue;
    const parent = row.parentId
      ? data.rows.find((r) => r.id === row.parentId)?.label
      : null;
    items.push(`${parent ? `${parent} — ` : ''}${row.label}: ${note}`);
  }
  return items;
}

function detailTable(rows: ComparisonCategoryRow[]): string {
  const body = rows
    .map(
      (r) => `<tr class="${r.parentId ? 'zone' : ''}">
        <td>${r.parentId ? '└ ' : ''}${escapeHtml(r.label)}</td>
        <td class="num">${r.initialScore}</td>
        <td class="num">${r.currentScore}</td>
        <td class="${trendClass(r.improvement)}"><b>${signed(r.improvement)}</b> ${escapeHtml(r.improvementLabel)}</td>
      </tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Categoría</th><th>Inicial</th><th>Actual</th><th>Mejora</th></tr></thead><tbody>${
    body || '<tr><td colspan="4">Sin métricas comparables.</td></tr>'
  }</tbody></table>`;
}

/** Barras agrupadas inicial/actual por categoría principal, en SVG. */
function evolutionChart(rows: ComparisonCategoryRow[]): string {
  const main = rows.filter((r) => !r.parentId);
  if (!main.length) return '<p class="text">Sin datos para graficar.</p>';
  // Margen derecho para la última etiqueta girada, que se cortaba.
  const width = 360;
  const right = 22;
  const height = 230;
  const left = 22;
  const bottom = 34;
  const plotH = height - bottom - 6;
  const slot = (width - left - right) / main.length;
  const bar = Math.min(9, slot / 2 - 1.5);
  const y = (v: number) => 6 + plotH - (plotH * v) / 100;
  const grid = [0, 25, 50, 75, 100]
    .map(
      (v) =>
        `<line x1="${left}" x2="${width - right}" y1="${y(v)}" y2="${y(v)}" stroke="#E2E8F0" stroke-width="0.6" /><text x="${left - 3}" y="${y(v) + 2}" font-size="6" text-anchor="end" fill="#94A3B8">${v}</text>`,
    )
    .join('');
  const bars = main
    .map((r, i) => {
      const cx = left + slot * i + slot / 2;
      const label = escapeHtml(
        r.label.length > 12 ? `${r.label.slice(0, 11)}…` : r.label,
      );
      return `<rect x="${cx - bar - 0.5}" y="${y(r.initialScore)}" width="${bar}" height="${y(0) - y(r.initialScore)}" rx="1.5" fill="#93C5FD" />
        <rect x="${cx + 0.5}" y="${y(r.currentScore)}" width="${bar}" height="${y(0) - y(r.currentScore)}" rx="1.5" fill="${BRAND_PRIMARY}" />
        <text transform="translate(${cx + 2} ${y(0) + 5}) rotate(45)" font-size="6" fill="#475569">${label}</text>`;
    })
    .join('');
  const legend = `<div style="display:flex;gap:12px;justify-content:center;font-size:8px;color:#475569;margin-top:2px">
    <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#93C5FD"></span> Inicial</span>
    <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${BRAND_PRIMARY}"></span> Actual</span>
  </div>`;
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución por categoría">${grid}${bars}</svg>${legend}`;
}

/** «Comparación de Análisis Estético», con la referencia del cliente. */
export function buildAestheticComparisonHtml(
  data: AestheticReportData,
): string {
  const a = data.initial.overall;
  const b = data.current.overall;
  const delta = a != null && b != null ? Math.round(b) - Math.round(a) : null;
  const summary = `<div style="display:flex;align-items:center;justify-content:center;gap:14px">
      ${scoreRing(a, 'Inicial')}<span style="font-size:20px;color:#94A3B8">→</span>${scoreRing(b, 'Actual')}
    </div>
    ${
      delta != null
        ? `<p class="${trendClass(delta)}" style="text-align:center;margin:6px 0 0;font-size:13px;font-weight:800">${signed(delta)} puntos</p>
           <p style="text-align:center;margin:0;font-size:8.5px;color:#64748B">Cambio en el análisis estético</p>`
        : ''
    }`;
  const conclusion = data.generalNote.trim() || automaticConclusion(data);
  const recs = recommendations(data)
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join('');

  return htmlDocument(`
    ${reportTop([
      { label: 'Paciente', value: data.patient.name },
      ...(data.patient.document
        ? [{ label: 'Documento', value: data.patient.document }]
        : []),
      { label: 'Análisis inicial', value: data.initial.date },
      { label: 'Análisis actual', value: data.current.date },
    ])}
    ${reportBand('Comparación de Análisis Estético', 'Evolución de tu piel en el tiempo')}
    <div class="grid2" style="grid-template-columns: 1.35fr 1fr">
      ${reportCard('Imágenes comparativas', `<div class="photos">${reportPhoto(data.initial, 'Inicial')}${reportPhoto(data.current, 'Actual')}</div>`)}
      ${reportCard('Resumen general', summary)}
    </div>
    <div class="grid2" style="grid-template-columns: 1.15fr 1fr">
      ${reportCard('Detalle por categoría', detailTable(data.rows))}
      ${reportCard('Gráfico de evolución', evolutionChart(data.rows))}
    </div>
    <div class="grid2">
      ${reportCard('Conclusiones', `<p class="text">${escapeHtml(conclusion)}</p>`)}
      ${reportCard('Recomendaciones', recs ? `<ul class="recs">${recs}</ul>` : '<p class="text">—</p>')}
    </div>
    ${reportFooter(data.generatedAt)}
  `);
}
