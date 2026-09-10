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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function html(payload: YoucamPdfPayload): string {
  const primary = payload.brandPrimary;
  const dark = payload.brandDark;
  const metrics = payload.metrics
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.title)}</td>
          <td>${Math.round(row.score)}</td>
          <td>${escapeHtml(row.band)}</td>
          <td>${escapeHtml(row.advice)}</td>
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 18mm 14mm 20mm; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1A1A; margin: 0; }
    header {
      background: ${primary};
      color: #fff;
      padding: 16px 18px 14px;
    }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.4px; }
    .brandSub { font-size: 12px; opacity: 0.9; margin-top: 2px; }
    main { padding: 18px 18px 8px; }
    h1 { font-size: 18px; margin: 0 0 8px; color: ${dark}; }
    .meta { color: #64748B; font-size: 13px; margin: 0 0 12px; }
    .stats p { margin: 0 0 4px; font-size: 14px; }
    .summary {
      margin-top: 14px;
      padding: 12px;
      border-radius: 12px;
      background: #F8FAFC;
      border: 1px solid #E5E7EB;
    }
    .summary h2 { margin: 0 0 6px; font-size: 13px; letter-spacing: 0.4px; color: ${dark}; }
    .summary p { margin: 0; font-size: 13px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
    th { color: ${dark}; font-size: 11px; text-transform: uppercase; }
    footer {
      margin-top: 22px;
      padding: 12px 18px 16px;
      border-top: 3px solid ${primary};
      color: ${dark};
      font-size: 11px;
    }
    .disclaimer { color: #64748B; margin-top: 4px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">PIEL 360</div>
    <div class="brandSub">Reporte de análisis estético · Salud de la piel</div>
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
        <tr><th>Métrica</th><th>Puntaje</th><th>Nivel</th><th>Lectura</th></tr>
      </thead>
      <tbody>${metrics || '<tr><td colspan="4">Sin métricas disponibles.</td></tr>'}</tbody>
    </table>
  </main>
  <footer>
    <strong>PIEL 360</strong> — Apoyo diagnóstico dermatológico con inteligencia artificial.
    <div class="disclaimer">Este reporte no sustituye una consulta médica presencial. Documento generado para el paciente ${escapeHtml(payload.patientName)}.</div>
  </footer>
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
  const markup = html(payload);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html: markup });
    return;
  }

  const file = await Print.printToFileAsync({
    html: markup,
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
