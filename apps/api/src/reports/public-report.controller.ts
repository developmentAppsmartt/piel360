import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { ReportPdfService } from './report-pdf.service';

/**
 * Sin auth — es el link que va dentro del correo de "reporte listo"
 * (`{report_url}`). El token es aleatorio (no el id del análisis), así que
 * no permite enumerar reportes de otros pacientes.
 */
@Controller('public/reports')
export class PublicReportController {
  constructor(
    private readonly reportPdf: ReportPdfService,
    private readonly storage: StorageService,
  ) {}

  @Get(':token')
  async getReport(@Param('token') token: string, @Res() res: Response) {
    const analysis = await this.reportPdf.findByToken(token);
    if (!analysis?.reportPdfKey) {
      throw new NotFoundException('Reporte no encontrado');
    }
    // Redirige a una URL firmada fresca — el link del correo así nunca
    // expira aunque las signed URLs de StorageService tengan un tope de 7 días.
    const url = await this.storage.getSignedUrl(analysis.reportPdfKey, 3600);
    return res.redirect(url);
  }
}
