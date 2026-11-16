import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Lead } from '@prisma/client';
import { leadIntentLabel, leadInterestLabel } from '@piel360/shared';
import { escapeHtml } from '../common/escape-html.util';
import { MailService } from '../mail/mail.service';

/** Avisa al equipo comercial de un contacto nuevo de la landing. */
@Injectable()
export class LeadNotificationService {
  private readonly logger = new Logger(LeadNotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async notify(lead: Lead): Promise<void> {
    const to =
      this.config.get<string>('LEADS_NOTIFY_EMAIL')?.trim() ||
      this.config.get<string>('SUPPORT_EMAIL')?.trim();
    if (!to) {
      this.logger.warn(
        `Lead ${lead.id} guardado sin aviso: falta LEADS_NOTIFY_EMAIL`,
      );
      return;
    }

    const rows: [string, string][] = [
      ['Nombre', lead.name],
      ['Clínica / negocio', lead.business],
      ['Correo', lead.email],
      ['Teléfono', lead.phone],
      ['Servicio de interés', leadInterestLabel(lead.interest)],
      ['Solicitud', leadIntentLabel(lead.intent)],
      [
        'Campaña',
        [lead.utmSource, lead.utmMedium, lead.utmCampaign]
          .filter(Boolean)
          .join(' / ') || '—',
      ],
    ];
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? '';
    const html = `
      <h2>Nuevo contacto desde la landing</h2>
      <table cellpadding="6">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`,
          )
          .join('')}
      </table>
      <p><a href="${frontendUrl}/admin/leads">Ver los leads en el panel</a></p>`;

    try {
      await this.mail.send({
        to,
        subject: `Nuevo lead: ${lead.business} (${leadIntentLabel(lead.intent)})`,
        html,
      });
    } catch (err) {
      this.logger.error(`No se pudo avisar del lead ${lead.id}`, err as Error);
    }
  }
}
