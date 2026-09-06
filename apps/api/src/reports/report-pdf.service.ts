import { randomBytes } from 'node:crypto';
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
const BAND_COLOR: Record<string, string> = {
  regular: '#F59E0B',
  promedio: '#3B82F6',
  buena: '#22C55E',
};

const RADAR_TYPES = [
  'hd_moisture',
  'hd_oiliness',
  'hd_firmness',
  'hd_age_spot',
  'hd_wrinkle',
  'hd_texture',
  'hd_pore',
  'hd_acne',
] as const;

/** Mismo cálculo de `RadarChart` en youcam-report-view.tsx, pero devolviendo
 * un string `<svg>` en vez de JSX (server-side, sin DOM). */
function renderRadarSvg(scores: Record<string, number>): string {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 95;
  const axes = RADAR_TYPES.filter((t) => scores[t] != null);
  if (axes.length < 3) return '';

  const points = axes.map((type, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const value = Math.max(0, Math.min(100, scores[type] ?? 0)) / 100;
    return {
      x: cx + Math.cos(angle) * radius * value,
      y: cy + Math.sin(angle) * radius * value,
      lx: cx + Math.cos(angle) * (radius + 20),
      ly: cy + Math.sin(angle) * (radius + 20),
      ax: cx + Math.cos(angle) * radius,
      ay: cy + Math.sin(angle) * radius,
      value: scores[type] ?? 0,
    };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');
  const rings = [0.25, 0.5, 0.75, 1]
    .map((r) => `<circle cx="${cx}" cy="${cy}" r="${radius * r}" fill="none" stroke="#e5e7eb" />`)
    .join('');
  const spokes = points
    .map((p) => `<line x1="${cx}" y1="${cy}" x2="${p.ax}" y2="${p.ay}" stroke="#e5e7eb" />`)
    .join('');
  const labels = points
    .map(
      (p) =>
        `<text x="${p.lx}" y="${p.ly}" text-anchor="middle" font-size="9" font-weight="bold" fill="#1a2b3c">${Math.round(p.value)}</text>`,
    )
    .join('');

  return `<svg viewBox="0 0 ${size} ${size}" width="280" height="280">
    ${rings}${spokes}
    <polygon points="${polygon}" fill="${BRAND_PRIMARY}33" stroke="${BRAND_PRIMARY}" stroke-width="2" />
    ${labels}
  </svg>`;
}

function buildSummary(scores: Record<string, number>, overall: number | null): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => YOUCAM_METRIC_LABELS[type] ?? type);

  if (overall != null && overall >= 90) {
    return 'Su piel está en buen estado general. Mantén tu rutina de cuidado y protección solar diaria.';
  }
  if (lows.length === 0) {
    return 'Su piel está en el promedio. Revisa las zonas detalladas abajo para priorizar tu rutina.';
  }
  return `Prioriza mejorar: ${lows.join(', ')}. Considera hidratación adecuada, protección solar y consulta dermatológica si persisten las molestias.`;
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
}

/**
 * Genera el PDF del "Reporte Salud de la Piel" (mismo diseño que
 * apps/web/src/components/analyses/youcam-report-view.tsx) para adjuntarlo
 * como link (`{report_url}`) al correo de "reporte listo" — ver
 * ReportEmailService. Solo cubre análisis de YouCam (Skiniver/Fitzpatrick
 * usan otro componente de resultados, con otro diseño).
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
    const band = overall != null ? youcamScoreBand(overall) : null;
    const name = `${patient.firstName} ${patient.lastName}`.trim();

    const gridTypes = [...new Set([...YOUCAM_MAIN_METRIC_TYPES, ...Object.keys(scores)])].filter(
      (t) => t !== 'all' && t !== 'skin_age' && t !== 'resize_image' && t !== 'hd_skin_type' && scores[t] != null,
    );

    const gridHtml = gridTypes
      .map((type) => {
        const score = scores[type] ?? 0;
        const color = BAND_COLOR[youcamScoreBand(score)];
        return `<td style="width:50%;padding:6px;">
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;">
              <strong>${YOUCAM_METRIC_LABELS[type] ?? type}</strong>
              <span style="color:${color};font-weight:bold;">${youcamScoreBandLabel(youcamScoreBand(score))}</span>
            </div>
            <div style="margin-top:6px;height:8px;border-radius:4px;background:#f1f5f9;overflow:hidden;">
              <div style="height:100%;width:${Math.max(0, Math.min(100, score))}%;background:${color};"></div>
            </div>
            <p style="text-align:right;margin:4px 0 0;font-weight:bold;">${Math.round(score)}</p>
          </div>
        </td>`;
      })
      .reduce<string[]>((rows, cell, i) => {
        if (i % 2 === 0) rows.push(`<tr>${cell}`);
        else rows[rows.length - 1] += `${cell}</tr>`;
        return rows;
      }, [])
      .map((row) => (row.endsWith('</tr>') ? row : `${row}</tr>`))
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a2b3c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
    <tr>
      <td style="border-bottom:3px solid ${BRAND_PRIMARY};padding-bottom:16px;">
        <h1 style="font-size:20px;margin:0;color:${BRAND_DARK};">Reporte Salud de la Piel</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${name} — ${analysis.createdAt.toLocaleDateString('es-CO')}</p>
      </td>
    </tr>
    <tr>
      <td style="padding-top:16px;font-size:14px;line-height:1.6;">
        <p>Tipo de piel: <strong>${skinType ? youcamSkinTypeLabel(skinType) : '—'}</strong></p>
        <p>Puntuación de la piel: <strong>${overall != null ? Math.round(overall) : '—'}</strong></p>
        <p>Edad de tu piel: <strong>${skinAge != null ? `${Math.round(skinAge)} años` : '—'}</strong></p>
        <p>Edad cronológica: <strong>${chronologicalAge != null ? `${chronologicalAge} años` : '—'}</strong></p>
        ${
          ageDiff != null
            ? `<p style="color:${ageDiff < 0 ? '#059669' : ageDiff > 0 ? '#dc2626' : '#64748b'};font-weight:bold;">
                Diferencia: ${formatSignedYears(ageDiff)} — ${skinAgeDifferenceMessage(ageDiff)}
              </p>`
            : ''
        }
        ${band ? `<p style="color:${BRAND_PRIMARY};font-weight:bold;">Su piel está en el ${youcamScoreBandLabel(band).toLowerCase()}</p>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 0;background:#f8fafc;border-radius:10px;">
        <p style="font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;margin:0 0 4px 16px;">Resumen</p>
        <p style="margin:0 16px;font-size:14px;line-height:1.5;">${buildSummary(scores, overall)}</p>
      </td>
    </tr>
    <tr>
      <td style="text-align:center;padding:16px 0;">${renderRadarSvg(scores)}</td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${gridHtml}</table>
      </td>
    </tr>
  </table>
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
      // Sin recursos externos (todo inline: SVG del radar, estilos) — 'load'
      // basta, no hace falta esperar red.
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'a4', printBackground: true });
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
      include: { patient: { select: { firstName: true, lastName: true, birthDate: true } } },
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
