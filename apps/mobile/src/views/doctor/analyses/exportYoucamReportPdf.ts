import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type YoucamPdfMetric = {
  title: string;
  score: number;
  band: string;
  advice: string;
};

export type YoucamPdfPayload = {
  patientName: string;
  createdAt: string;
  skinType: string;
  fitzpatrick: string | null;
  overall: number | null;
  skinAge: number | null;
  chronologicalAge: number | null;
  ageDiffLabel: string | null;
  ageDiffMessage: string | null;
  bandLabel: string | null;
  summary: string;
  metrics: YoucamPdfMetric[];
  brandPrimary: string;
  brandDark: string;
};

const HEADER_LOGO = require('../../../../assets/logo-headers.png');
const FOOTER_LOGO = require('../../../../assets/logo-piel360-brand.jpeg');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function assetToDataUri(
  moduleId: number,
  mime: string,
): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return null;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function html(
  payload: YoucamPdfPayload,
  headerLogoUri: string | null,
  footerLogoUri: string | null,
): string {
  const primary = payload.brandPrimary;
  const dark = payload.brandDark;
  const metrics = payload.metrics
    .map(
      (row) => `
        <tr>
          <td class="col-metric">${escapeHtml(row.title)}</td>
          <td class="col-score">${Math.round(row.score)}</td>
          <td class="col-band">${escapeHtml(row.band)}</td>
          <td class="col-advice">${escapeHtml(row.advice)}</td>
        </tr>`,
    )
    .join('');

  const stats = [
    `Tipo de piel: ${payload.skinType}`,
    payload.fitzpatrick ? `Piel: Tipo ${payload.fitzpatrick}` : null,
    `Puntuación de la piel: ${payload.overall != null ? Math.round(payload.overall) : '—'}`,
    `Edad de tu piel: ${payload.skinAge != null ? `${Math.round(payload.skinAge)} años` : '—'}`,
    `Edad cronológica: ${payload.chronologicalAge != null ? `${payload.chronologicalAge} años` : '—'}`,
    payload.ageDiffLabel ? `Diferencia: ${payload.ageDiffLabel}` : null,
    payload.ageDiffMessage,
    payload.bandLabel ? `Valoración: ${payload.bandLabel}` : null,
  ]
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(String(line))}</p>`)
    .join('');

  const headerLogo = headerLogoUri
    ? `<img class="header-logo" src="${headerLogoUri}" alt="PIEL 360" />`
    : '';
  const footerLogo = footerLogoUri
    ? `<img class="footer-logo" src="${footerLogoUri}" alt="PIEL 360" />`
    : `<div class="footer-logo-fallback"><strong>PIEL 360</strong><span>EXPLORA TU PIEL, ENTIENDE TU SALUD</span></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      font-family: Helvetica, Arial, sans-serif;
      color: #1A1A1A;
      background: #fff;
    }
    .page {
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      flex: 0 0 auto;
      background: ${primary};
      color: #fff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .header-left { min-width: 0; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.4px; line-height: 1.1; }
    .brandSub { font-size: 10px; opacity: 0.92; margin-top: 2px; }
    .header-meta { font-size: 9px; opacity: 0.88; margin-top: 4px; }
    .header-logo {
      height: 34px;
      width: auto;
      max-width: 150px;
      object-fit: contain;
      flex-shrink: 0;
    }
    main {
      flex: 1 1 auto;
      padding: 12px 16px 8px;
      overflow: hidden;
      min-height: 0;
    }
    h1 {
      font-size: 15px;
      margin: 0 0 3px;
      color: ${dark};
      line-height: 1.2;
    }
    .meta {
      color: #64748B;
      font-size: 11px;
      margin: 0 0 8px;
    }
    .stats p {
      margin: 0 0 2px;
      font-size: 11px;
      line-height: 1.35;
    }
    .summary {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #F8FAFC;
      border: 1px solid #E5E7EB;
    }
    .summary h2 {
      margin: 0 0 3px;
      font-size: 10px;
      letter-spacing: 0.4px;
      color: ${dark};
    }
    .summary p {
      margin: 0;
      font-size: 10px;
      line-height: 1.35;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      table-layout: fixed;
    }
    th, td {
      text-align: left;
      padding: 3px 4px;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: top;
      font-size: 8.5px;
      line-height: 1.25;
    }
    th {
      color: ${dark};
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding-bottom: 4px;
    }
    .col-metric { width: 18%; font-weight: 600; }
    .col-score { width: 10%; }
    .col-band { width: 12%; }
    .col-advice { width: 60%; color: #334155; }
    footer {
      flex: 0 0 auto;
      margin-top: auto;
      padding: 8px 16px 10px;
      border-top: 3px solid ${primary};
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .footer-text { min-width: 0; flex: 1; }
    .footer-brand {
      color: ${dark};
      font-size: 10px;
      font-weight: 700;
      line-height: 1.3;
    }
    .disclaimer {
      color: #64748B;
      margin-top: 2px;
      font-size: 8.5px;
      line-height: 1.3;
    }
    .footer-stamp {
      color: #94A3B8;
      margin-top: 2px;
      font-size: 8px;
    }
    .footer-logo {
      height: 42px;
      width: auto;
      max-width: 150px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .footer-logo-fallback {
      text-align: right;
      color: ${dark};
      flex-shrink: 0;
    }
    .footer-logo-fallback strong {
      display: block;
      font-size: 12px;
    }
    .footer-logo-fallback span {
      display: block;
      font-size: 7px;
      letter-spacing: 0.3px;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="header-left">
        <div class="brand">PIEL 360</div>
        <div class="brandSub">Reporte de análisis estético · Salud de la piel</div>
        <div class="header-meta">Generado: ${escapeHtml(payload.createdAt)}</div>
      </div>
      ${headerLogo}
    </header>
    <main>
      <h1>Reporte Salud de la Piel</h1>
      <p class="meta">Paciente: ${escapeHtml(payload.patientName)} · ${escapeHtml(payload.createdAt)}</p>
      <div class="stats">${stats}</div>
      <div class="summary">
        <h2>RESUMEN</h2>
        <p>${escapeHtml(payload.summary)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-metric">Métrica</th>
            <th class="col-score">Puntaje</th>
            <th class="col-band">Nivel</th>
            <th class="col-advice">Lectura</th>
          </tr>
        </thead>
        <tbody>${metrics || '<tr><td colspan="4">Sin métricas disponibles.</td></tr>'}</tbody>
      </table>
    </main>
    <footer>
      <div class="footer-text">
        <div class="footer-brand">PIEL 360 — Apoyo diagnóstico dermatológico con inteligencia artificial.</div>
        <div class="disclaimer">Este reporte no sustituye una consulta médica presencial. Documento generado para el paciente ${escapeHtml(payload.patientName)}.</div>
        <div class="footer-stamp">Fecha y hora de creación: ${escapeHtml(payload.createdAt)}</div>
      </div>
      ${footerLogo}
    </footer>
  </div>
</body>
</html>`;
}

/**
 * expo-print deja el PDF en `cache/Print`, ruta que Expo Go / Sharing
 * no puede leer. Lo reescribimos en la caché de la app y compartimos esa copia.
 */
async function persistShareablePdf(sourceUri: string, base64?: string) {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('No hay carpeta de caché para guardar el PDF.');
  }
  const dest = `${cacheDir}piel360-reporte-${Date.now()}.pdf`;
  if (base64) {
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }
  return dest;
}

export async function exportYoucamReportPdf(payload: YoucamPdfPayload) {
  const [headerLogoUri, footerLogoUri] = await Promise.all([
    assetToDataUri(HEADER_LOGO, 'image/png'),
    assetToDataUri(FOOTER_LOGO, 'image/jpeg'),
  ]);
  const markup = html(payload, headerLogoUri, footerLogoUri);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html: markup });
    return;
  }

  const file = await Print.printToFileAsync({
    html: markup,
    // A4 en puntos (72 dpi): una sola hoja
    width: 595,
    height: 842,
    base64: true,
  });
  if (!file.base64) {
    throw new Error('No se generó el contenido del PDF.');
  }
  const uri = await persistShareablePdf(file.uri, file.base64);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    await Print.printAsync({ uri });
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Compartir reporte Piel 360',
  });
}
