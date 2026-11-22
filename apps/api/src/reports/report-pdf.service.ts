import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { baseApiPublica } from '../email-templates/banner-urls';
import { htmlToPdf } from './pdf-render';
import { buildReportHtml } from './report-pdf-html';

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

  /**
   * Genera (una sola vez) y devuelve la URL pública permanente del PDF del
   * reporte — `${PUBLIC_API_URL}/api/public/reports/{token}`.
   *
   * Se arma con la URL pública de la **API**, que es quien sirve esa ruta
   * (PublicReportController). Antes se usaba FRONTEND_URL y funcionaba solo
   * por el rewrite de `/api/*` de next.config.ts, que a su vez dependía de
   * BACKEND_ORIGIN: al dejar de usarse ese proxy (la cookie ahora se comparte
   * entre subdominios vía COOKIE_DOMAIN), el enlace empezó a dar 404.
   */
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

    // FRONTEND_URL como respaldo por compatibilidad: en despliegues donde el
    // front sí proxye /api/* el enlace sigue siendo válido.
    const baseUrl = baseApiPublica(this.config);

    if (analysis.reportToken && analysis.reportPdfKey) {
      return `${baseUrl}/api/public/reports/${analysis.reportToken}`;
    }

    try {
      const html = buildReportHtml(analysis, analysis.patient);
      const pdf = await htmlToPdf(html, { singlePage: true });
      const key = `analyses/${analysisId}/report.pdf`;
      await this.storage.upload(key, pdf, 'application/pdf');
      // Se reaprovecha el token existente: al regenerar el PDF (p. ej. porque
      // cambiaron las observaciones) un token nuevo dejaría en 404 el enlace
      // que ya se envió por correo.
      const token = analysis.reportToken ?? randomBytes(32).toString('hex');
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { reportToken: token, reportPdfKey: key },
      });
      return `${baseUrl}/api/public/reports/${token}`;
    } catch (error) {
      // `error` y no `warn`, y con stack: este catch se tragaba la causa real
      // (p. ej. "Could not find Chrome") y el cliente solo veia un error
      // generico, sin forma de saber que estaba pasando.
      this.logger.error(
        `No se pudo generar el PDF del reporte para el análisis ${analysisId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
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
