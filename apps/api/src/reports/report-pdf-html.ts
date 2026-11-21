import {
  chronologicalAgeYears,
  formatSignedYears,
  parseAnalisisPiel360Metrics,
  skinAgeDifference,
  skinAgeDifferenceMessage,
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  ANALISIS_PIEL360_METRIC_LABELS,
  analisisPiel360OverallScore,
  analisisPiel360ScoreBand,
  analisisPiel360ScoreBandLabel,
  analisisPiel360ScoresByType,
  analisisPiel360SkinAge,
  analisisPiel360SkinType,
  analisisPiel360SkinTypeLabel,
  type AnalisisPiel360RawResponse,
} from '@piel360/shared';
import {
  BRAND_DARK,
  BRAND_PRIMARY,
  brandLogos,
  escapeHtml,
  formatStamp,
} from './pdf-render';

function buildSummary(
  scores: Record<string, number>,
  overall: number | null,
  skinTypeLabel: string | null,
): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => ANALISIS_PIEL360_METRIC_LABELS[type] ?? type);

  const typeHint = skinTypeLabel
    ? ` Tu tipo de piel es ${skinTypeLabel.toLowerCase()}.`
    : '';

  if (overall != null && overall >= 90) {
    return `Ya vas camino a una gran piel.${typeHint} Mantén tu rutina y protección solar diaria. Revisa el detalle de cada métrica abajo.`;
  }
  if (overall != null && overall >= 70) {
    return `Vas en el promedio.${typeHint}${lows.length ? ` Prioriza: ${lows.join(', ')}.` : ''} Revisa el detalle de cada métrica abajo.`;
  }
  if (lows.length === 0) {
    return `Hay espacio para mejorar.${typeHint} Revisa las zonas detalladas abajo para priorizar tu rutina.`;
  }
  return `Prioriza mejorar: ${lows.join(', ')}.${typeHint} Considera hidratación adecuada, protección solar y consulta dermatológica si persisten las molestias.`;
}

function defaultAdvice(band: string): string {
  if (band === 'buena') {
    return '¡Excelente resultado en esta métrica! Mantén tu rutina y la protección solar.';
  }
  if (band === 'promedio') {
    return 'Vas en buen camino. Pequeños ajustes en hidratación y SPF pueden llevarte al siguiente nivel.';
  }
  return 'Con un poco más de cuidado enfocado puedes mejorar esta área. Revisa la rutina y la protección solar diaria.';
}

export interface ReportAnalysis {
  aiRawResponse: unknown;
  createdAt: Date;
  skinAgeYears: number | null;
  chronologicalAgeYears: number | null;
  skinAgeDifference: number | null;
  doctorNotes: string | null;
}

export interface ReportPatient {
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  fitzpatrickType?: string | null;
}

/** El "Reporte Salud de la Piel" (una hoja A4, mismo layout que la descarga
 * móvil). */
export function buildReportHtml(
  analysis: ReportAnalysis,
  patient: ReportPatient,
): string {
  const metrics = parseAnalisisPiel360Metrics(
    analysis.aiRawResponse as AnalisisPiel360RawResponse | null,
  );
  const scores = analisisPiel360ScoresByType(metrics, false);
  const overall = analisisPiel360OverallScore(metrics);
  const skinAge = analysis.skinAgeYears ?? analisisPiel360SkinAge(metrics);
  const chronologicalAge =
    analysis.chronologicalAgeYears ??
    chronologicalAgeYears(patient.birthDate, analysis.createdAt);
  const ageDiff =
    analysis.skinAgeDifference ?? skinAgeDifference(skinAge, chronologicalAge);
  const skinType = analisisPiel360SkinType(metrics);
  const skinTypeLabel = skinType
    ? analisisPiel360SkinTypeLabel(skinType)
    : null;
  const band = overall != null ? analisisPiel360ScoreBand(overall) : null;
  const name = `${patient.firstName} ${patient.lastName}`.trim();
  const createdAt = formatStamp(analysis.createdAt);

  const { header: headerLogo, footer: footerLogo } = brandLogos();

  const rows = ANALISIS_PIEL360_MAIN_METRIC_TYPES.filter(
    (type) => scores[type] != null,
  ).map((type) => {
    const score = scores[type] ?? 0;
    const itemBand = analisisPiel360ScoreBand(score);
    return {
      title: ANALISIS_PIEL360_METRIC_LABELS[type] ?? type,
      score,
      band: analisisPiel360ScoreBandLabel(itemBand),
      advice: defaultAdvice(itemBand),
    };
  });

  const metricsHtml = rows
    .map(
      (row) => `<tr>
        <td class="col-metric">${escapeHtml(row.title)}</td>
        <td class="col-score">${Math.round(row.score)}</td>
        <td class="col-band">${escapeHtml(row.band)}</td>
        <td class="col-advice">${escapeHtml(row.advice)}</td>
      </tr>`,
    )
    .join('');

  const stats = [
    `Tipo de piel: ${skinTypeLabel ?? '—'}`,
    patient.fitzpatrickType != null
      ? `Piel: Tipo ${patient.fitzpatrickType}`
      : null,
    `Puntuación de la piel: ${overall != null ? Math.round(overall) : '—'}`,
    `Edad de tu piel: ${skinAge != null ? `${Math.round(skinAge)} años` : '—'}`,
    `Edad cronológica: ${chronologicalAge != null ? `${chronologicalAge} años` : '—'}`,
    ageDiff != null ? `Diferencia: ${formatSignedYears(ageDiff)}` : null,
    ageDiff != null ? skinAgeDifferenceMessage(ageDiff) : null,
    band ? `Valoración: ${analisisPiel360ScoreBandLabel(band)}` : null,
  ]
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(String(line))}</p>`)
    .join('');

  const notes = analysis.doctorNotes?.trim();
  const notesHtml = notes
    ? `<div class="notes">
      <h2>OBSERVACIONES DEL MÉDICO</h2>
      <p>${escapeHtml(notes)}</p>
    </div>`
    : '';

  const headerLogoHtml = headerLogo
    ? `<img class="header-logo" src="${headerLogo}" alt="PIEL 360" />`
    : '';
  const footerLogoHtml = footerLogo
    ? `<img class="footer-logo" src="${footerLogo}" alt="PIEL 360" />`
    : `<div class="footer-logo-fallback"><strong>PIEL 360</strong><span>EXPLORA TU PIEL, ENTIENDE TU SALUD</span></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 210mm; height: 297mm; overflow: hidden;
    font-family: Helvetica, Arial, sans-serif; color: #1A1A1A; background: #fff;
  }
  .page { width: 210mm; height: 297mm; display: flex; flex-direction: column; overflow: hidden; }
  header {
    flex: 0 0 auto; background: ${BRAND_PRIMARY}; color: #fff; padding: 10px 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.4px; line-height: 1.1; }
  .brandSub { font-size: 10px; opacity: 0.92; margin-top: 2px; }
  .header-meta { font-size: 9px; opacity: 0.88; margin-top: 4px; }
  .header-logo { height: 34px; width: auto; max-width: 150px; object-fit: contain; flex-shrink: 0; }
  main { flex: 1 1 auto; padding: 12px 16px 8px; overflow: hidden; min-height: 0; }
  h1 { font-size: 15px; margin: 0 0 3px; color: ${BRAND_DARK}; line-height: 1.2; }
  .meta { color: #64748B; font-size: 11px; margin: 0 0 8px; }
  .stats p { margin: 0 0 2px; font-size: 11px; line-height: 1.35; }
  .summary {
    margin-top: 8px; padding: 8px 10px; border-radius: 8px;
    background: #F8FAFC; border: 1px solid #E5E7EB;
  }
  .summary h2 { margin: 0 0 3px; font-size: 10px; letter-spacing: 0.4px; color: ${BRAND_DARK}; }
  .summary p { margin: 0; font-size: 10px; line-height: 1.35; }
  .notes {
    margin-top: 6px; padding: 8px 10px; border-radius: 8px;
    background: #F8FAFC; border: 1px solid #E5E7EB;
    max-height: 30mm; overflow: hidden;
  }
  .notes h2 { margin: 0 0 3px; font-size: 10px; letter-spacing: 0.4px; color: ${BRAND_DARK}; }
  .notes p { margin: 0; font-size: 10px; line-height: 1.35; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
  th, td {
    text-align: left; padding: 3px 4px; border-bottom: 1px solid #E5E7EB;
    vertical-align: top; font-size: 8.5px; line-height: 1.25;
  }
  th { color: ${BRAND_DARK}; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; padding-bottom: 4px; }
  .col-metric { width: 18%; font-weight: 600; }
  .col-score { width: 10%; }
  .col-band { width: 12%; }
  .col-advice { width: 60%; color: #334155; }
  footer {
    flex: 0 0 auto; margin-top: auto; padding: 8px 16px 10px; border-top: 3px solid ${BRAND_PRIMARY};
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .footer-brand { color: ${BRAND_DARK}; font-size: 10px; font-weight: 700; line-height: 1.3; }
  .disclaimer { color: #64748B; margin-top: 2px; font-size: 8.5px; line-height: 1.3; }
  .footer-stamp { color: #94A3B8; margin-top: 2px; font-size: 8px; }
  .footer-logo { height: 42px; width: auto; max-width: 150px; object-fit: contain; flex-shrink: 0; }
  .footer-logo-fallback { text-align: right; color: ${BRAND_DARK}; flex-shrink: 0; }
  .footer-logo-fallback strong { display: block; font-size: 12px; }
  .footer-logo-fallback span { display: block; font-size: 7px; letter-spacing: 0.3px; margin-top: 1px; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div>
      <div class="brand">PIEL 360</div>
      <div class="brandSub">Reporte de análisis estético · Salud de la piel</div>
      <div class="header-meta">Generado: ${escapeHtml(createdAt)}</div>
    </div>
    ${headerLogoHtml}
  </header>
  <main>
    <h1>Reporte Salud de la Piel</h1>
    <p class="meta">Paciente: ${escapeHtml(name)} · ${escapeHtml(createdAt)}</p>
    <div class="stats">${stats}</div>
    <div class="summary">
      <h2>RESUMEN</h2>
      <p>${escapeHtml(buildSummary(scores, overall, skinTypeLabel))}</p>
    </div>
    ${notesHtml}
    <table>
      <thead>
        <tr>
          <th class="col-metric">Métrica</th>
          <th class="col-score">Puntaje</th>
          <th class="col-band">Nivel</th>
          <th class="col-advice">Lectura</th>
        </tr>
      </thead>
      <tbody>${metricsHtml || '<tr><td colspan="4">Sin métricas disponibles.</td></tr>'}</tbody>
    </table>
  </main>
  <footer>
    <div>
      <div class="footer-brand">Reporte Salud de la Piel</div>
      <div class="disclaimer">Este reporte no sustituye una consulta médica presencial. Documento generado para el paciente ${escapeHtml(name)}.</div>
      <div class="footer-stamp">Fecha y hora de creación: ${escapeHtml(createdAt)}</div>
    </div>
    ${footerLogoHtml}
  </footer>
</div>
</body>
</html>`;
}
