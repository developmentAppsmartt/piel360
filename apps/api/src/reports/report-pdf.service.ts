import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer';
import {
  chronologicalAgeYears,
  formatSignedYears,
  parseYoucamMetrics,
  skinAgeDifference,
  skinAgeDifferenceMessage,
  YOUCAM_MAIN_METRIC_TYPES,
  YOUCAM_METRIC_LABELS,
  youcamOverallScore,
  youcamScoreBand,
  youcamScoreBandLabel,
  youcamScoresByType,
  youcamSkinAge,
  youcamSkinType,
  youcamSkinTypeLabel,
  type YoucamRawResponse,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const BRAND_PRIMARY = '#1e5a9e';
const BRAND_DARK = '#0f3d73';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatStamp(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

function buildSummary(scores: Record<string, number>, overall: number | null, skinTypeLabel: string | null): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => YOUCAM_METRIC_LABELS[type] ?? type);

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

interface ReportAnalysis {
  aiRawResponse: unknown;
  createdAt: Date;
  skinAgeYears: number | null;
  chronologicalAgeYears: number | null;
  skinAgeDifference: number | null;
}

interface ReportPatient {
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  fitzpatrickType?: string | null;
}

/**
 * Genera el PDF del "Reporte Salud de la Piel" (una hoja A4, mismo layout
 * que la descarga móvil) para adjuntarlo como link al correo de reporte listo.
 */
@Injectable()
export class ReportPdfService {
  private readonly logger = new Logger(ReportPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private buildReportHtml(analysis: ReportAnalysis, patient: ReportPatient): string {
    const metrics = parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null);
    const scores = youcamScoresByType(metrics, false);
    const overall = youcamOverallScore(metrics);
    const skinAge = analysis.skinAgeYears ?? youcamSkinAge(metrics);
    const chronologicalAge =
      analysis.chronologicalAgeYears ?? chronologicalAgeYears(patient.birthDate, analysis.createdAt);
    const ageDiff = analysis.skinAgeDifference ?? skinAgeDifference(skinAge, chronologicalAge);
    const skinType = youcamSkinType(metrics);
    const skinTypeLabel = skinType ? youcamSkinTypeLabel(skinType) : null;
    const band = overall != null ? youcamScoreBand(overall) : null;
    const name = `${patient.firstName} ${patient.lastName}`.trim();
    const createdAt = formatStamp(analysis.createdAt);

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

    const rows = YOUCAM_MAIN_METRIC_TYPES.filter((type) => scores[type] != null).map((type) => {
      const score = scores[type] ?? 0;
      const itemBand = youcamScoreBand(score);
      return {
        title: YOUCAM_METRIC_LABELS[type] ?? type,
        score,
        band: youcamScoreBandLabel(itemBand),
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
      patient.fitzpatrickType != null ? `Piel: Tipo ${patient.fitzpatrickType}` : null,
      `Puntuación de la piel: ${overall != null ? Math.round(overall) : '—'}`,
      `Edad de tu piel: ${skinAge != null ? `${Math.round(skinAge)} años` : '—'}`,
      `Edad cronológica: ${chronologicalAge != null ? `${chronologicalAge} años` : '—'}`,
      ageDiff != null ? `Diferencia: ${formatSignedYears(ageDiff)}` : null,
      ageDiff != null ? skinAgeDifferenceMessage(ageDiff) : null,
      band ? `Valoración: ${youcamScoreBandLabel(band)}` : null,
    ]
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(String(line))}</p>`)
      .join('');

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

  private async generatePdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'a4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        pageRanges: '1',
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /** Genera (una sola vez) y devuelve la URL pública permanente del PDF del
   * reporte para un análisis — `${FRONTEND_URL}/api/public/reports/{token}`. */
  async ensureReportUrl(analysisId: bigint): Promise<string | null> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            birthDate: true,
            fitzpatrickType: true,
          },
        },
      },
    });
    if (!analysis) return null;

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '');

    if (analysis.reportToken && analysis.reportPdfKey) {
      return `${frontendUrl}/api/public/reports/${analysis.reportToken}`;
    }

    try {
      const html = this.buildReportHtml(analysis, analysis.patient);
      const pdf = await this.generatePdf(html);
      const key = `analyses/${analysisId}/report.pdf`;
      await this.storage.upload(key, pdf, 'application/pdf');
      const token = randomBytes(32).toString('hex');
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { reportToken: token, reportPdfKey: key },
      });
      return `${frontendUrl}/api/public/reports/${token}`;
    } catch (error) {
      this.logger.warn(
        `No se pudo generar el PDF del reporte para el análisis ${analysisId}: ${String(error)}`,
      );
      return null;
    }
  }

  /** Usado por PublicReportController para servir el PDF a partir del token. */
  async findByToken(token: string) {
    return this.prisma.analysis.findUnique({
      where: { reportToken: token },
      select: { reportPdfKey: true },
    });
  }
}
