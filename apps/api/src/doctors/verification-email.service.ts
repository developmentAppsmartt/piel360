import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';

/** Un kind por botón del panel de verificación (Rechazar / Solicitar ajustes
 * / Verificar y aprobar), para que cada uno tenga su plantilla editable. */
export const VERIFICATION_EMAIL_KINDS = {
  rejected: 'doctor_verification_rejected',
  in_review: 'doctor_verification_changes_requested',
  approved: 'doctor_verification_approved',
} as const;

export type VerificationDecision = keyof typeof VERIFICATION_EMAIL_KINDS;

export interface VerificationEmail {
  decision: VerificationDecision;
  to: string;
  firstName: string;
  lastName: string;
  /** Especialidad o perfil técnico — lo que el cliente llama «rol». */
  professionalRole: string;
  /** Nombre de la empresa cuando el registro es de una; si no, Piel360. */
  clinicName: string;
  /** Observación del moderador: motivo del rechazo o ajuste pedido. */
  note: string;
}

/**
 * Correos de moderación del registro. Mismo patrón que
 * `TeamInviteEmailService`/`PatientInviteService`: resuelve la plantilla
 * guardada, cae al contenido por defecto, sustituye y envía.
 *
 * La plantilla es **de plataforma** (`doctorId: null`): no es de ningún
 * doctor, la edita el moderador o el superadmin desde el panel admin.
 */
@Injectable()
export class VerificationEmailService {
  private readonly logger = new Logger(VerificationEmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
    // La plantilla se lee con Prisma y no con EmailTemplatesService: ese
    // módulo importa OrganizationsModule, que importa este, y el ciclo
    // obligaba a sembrar forwardRef en media docena de sitios. La consulta
    // es la misma que hace `findActiveByKind` con doctorId NULL.
    private readonly prisma: PrismaService,
  ) {}

  /** `false` si el correo no salió. La decisión del moderador no se deshace
   * por eso: el estado ya cambió y lo útil es avisarle en el panel. */
  async send(email: VerificationEmail): Promise<boolean> {
    const kind = VERIFICATION_EMAIL_KINDS[email.decision];
    const template = await this.prisma.emailTemplate.findFirst({
      where: { doctorId: null, kind, isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
      select: { subject: true, bodyHtml: true },
    });

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ??
      'http://localhost:3001';
    const loginUrl = `${frontendUrl}/doctor/login`;

    const values: Record<string, string> = {
      '{nombre}': email.firstName,
      '{apellido}': email.lastName,
      '{email}': email.to,
      '{clinic_name}': email.clinicName,
      '{rol_profesional}': email.professionalRole,
      '{observacion}': escapeHtml(email.note),
      '{fecha_revision}': formatReviewDate(new Date()),
      // Los tres llevan al mismo sitio: corregir el registro y entrar son la
      // misma puerta. Se mantienen separadas porque el texto del botón cambia.
      '{url_registro}': loginUrl,
      '{url_plataforma}': loginUrl,
      '{correo_soporte}': this.supportEmail(),
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[kind];
    const subject = applyEmailTemplateVariables(
      template?.subject ?? defaults.subject,
      values,
    );
    const html = applyEmailTemplateVariables(
      template?.bodyHtml ?? defaults.bodyHtml,
      values,
    );

    try {
      return await this.mail.send({ to: email.to, subject, html });
    } catch (error) {
      this.logger.warn(
        `No se pudo avisar a ${email.to} de la decisión «${email.decision}»: ${String(error)}`,
      );
      return false;
    }
  }

  /** Contacto que se publica en el correo. Sin `SUPPORT_EMAIL` se usa el
   * remitente, que siempre está configurado. */
  private supportEmail(): string {
    const explicit = this.config.get<string>('SUPPORT_EMAIL')?.trim();
    if (explicit) return explicit;
    const from =
      this.config.get<string>('MAIL_FROM') ?? 'no-reply@piel360.com';
    return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  }
}

/** La observación la escribe una persona en un textarea y acaba dentro del
 * HTML del correo: sin escapar, un `<` parte la maqueta. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatReviewDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}
