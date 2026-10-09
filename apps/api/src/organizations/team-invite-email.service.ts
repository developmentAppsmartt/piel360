import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { MailService } from '../mail/mail.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

export const TEAM_MEMBER_INVITATION_KIND = 'team_member_invitation';

export interface TeamInviteEmail {
  /** Doctor del dueño: es su plantilla la que se usa, no la del invitado. */
  ownerDoctorId: bigint;
  organizationName: string;
  /** Contacto de la empresa para «si no reconoces esta invitación». */
  supportEmail: string;
  firstName: string;
  lastName: string;
  email: string;
  /** En claro: es la que el dueño acaba de escribir y la que el invitado necesita. */
  temporaryPassword: string;
  /** Especialidad o perfil técnico elegido — en el catálogo son los nombres
   * de rol que entiende el cliente ("Dermatólogo", "Estética médica"). */
  professionalRole: string;
}

/**
 * Puente entre la plantilla guardada (`EmailTemplate`, kind=
 * "team_member_invitation") y el envío real — mismo patrón que
 * `PatientInviteService`/`ReportEmailService`/`AppointmentEmailService`.
 *
 * Se dispara al añadir un miembro al equipo (`OrganizationsService.addDoctor`).
 */
@Injectable()
export class TeamInviteEmailService {
  private readonly logger = new Logger(TeamInviteEmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
    // EmailTemplatesModule importa OrganizationsModule para OrgContextService,
    // así que la vuelta es un ciclo — mismo `forwardRef` que ya usan
    // plans/subscriptions/youcam.
    @Inject(forwardRef(() => EmailTemplatesService))
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  /** `false` si el correo no salió. El alta del miembro no se deshace por eso:
   * el usuario ya existe y el asiento ya se consumió, así que lo útil es
   * avisarle al dueño para que pase la clave a mano. */
  async sendInvite(invite: TeamInviteEmail): Promise<boolean> {
    const template = await this.emailTemplates.findActiveByKind(
      invite.ownerDoctorId,
      TEAM_MEMBER_INVITATION_KIND,
    );

    // El invitado entra por el login normal: siendo `pending`, el panel ya lo
    // acota a Configuración, que es donde completa su registro.
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ??
      'http://localhost:3001';

    const values: Record<string, string> = {
      '{nombre}': invite.firstName,
      '{apellido}': invite.lastName,
      '{email}': invite.email,
      '{clinic_name}': invite.organizationName,
      '{clave_temporal}': invite.temporaryPassword,
      '{url_registro}': `${frontendUrl}/doctor/login`,
      '{rol_profesional}': invite.professionalRole,
      '{correo_soporte}': invite.supportEmail,
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[TEAM_MEMBER_INVITATION_KIND];
    const subject = applyEmailTemplateVariables(
      template?.subject ?? defaults.subject,
      values,
    );
    const html = applyEmailTemplateVariables(
      template?.bodyHtml ?? defaults.bodyHtml,
      values,
    );

    try {
      return await this.mail.send({ to: invite.email, subject, html });
    } catch (error) {
      this.logger.warn(
        `No se pudo invitar a ${invite.email}: ${String(error)}`,
      );
      return false;
    }
  }
}
