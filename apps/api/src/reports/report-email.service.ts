import { Injectable, Logger } from '@nestjs/common';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { ReportPdfService } from './report-pdf.service';

const REPORT_READY_KIND = 'report_ready';

/**
 * Puente entre las plantillas guardadas (`EmailTemplate`, kind="report_ready")
 * y el envío real (`MailService`/Brevo) — hoy ese módulo era CRUD puro, sin
 * disparar nada. Se llama desde `YoucamResultsService.applySuccess()` al
 * completarse un análisis.
 */
@Injectable()
export class ReportEmailService {
  private readonly logger = new Logger(ReportEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly reportPdf: ReportPdfService,
  ) {}

  async sendReportReadyEmail(analysisId: bigint): Promise<void> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        patient: {
          include: { doctor: { include: { user: true } } },
        },
      },
    });
    if (!analysis?.patient.email) return;
    if (!analysis.patient.doctorId) return;

    const reportUrl = await this.reportPdf.ensureReportUrl(analysisId);

    const template = await this.emailTemplates.findActiveByKind(
      analysis.patient.doctorId,
      REPORT_READY_KIND,
    );

    const clinicName =
      analysis.patient.doctor?.user.name?.trim() || 'Piel360';
    const values: Record<string, string> = {
      '{nombre}': analysis.patient.firstName,
      '{apellido}': analysis.patient.lastName,
      '{email}': analysis.patient.email,
      '{report_url}': reportUrl ?? '#',
      '{clinic_name}': clinicName,
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[REPORT_READY_KIND];
    const subjectRaw = template?.subject ?? defaults.subject;
    const bodyRaw = template?.bodyHtml ?? defaults.bodyHtml;

    const subject = applyEmailTemplateVariables(subjectRaw, values);
    const html = applyEmailTemplateVariables(bodyRaw, values);

    try {
      await this.mail.send({ to: analysis.patient.email, subject, html });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de reporte listo del análisis ${analysisId}: ${String(error)}`,
      );
    }
  }
}
