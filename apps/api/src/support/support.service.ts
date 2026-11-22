import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { supportRequestTypeLabel } from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import { escapeHtml } from '../common/escape-html.util';
import { MailService } from '../mail/mail.service';
import type { CreateSupportRequestDto } from './dto/create-support-request.dto';

const DEFAULT_SUPPORT_EMAIL = 'soporte@piel360.com';

/** Tipo real por la firma del archivo: el mimetype lo decide el navegador. */
function attachmentKind(buffer: Buffer): 'png' | 'jpg' | 'webp' | 'pdf' | null {
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    return 'png';
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return 'jpg';
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

/** Nombre del adjunto sin rutas ni caracteres raros, con la extensión real. */
function safeAttachmentName(original: string | undefined, ext: string): string {
  const base = (original ?? 'adjunto')
    .replace(/\.[^.]*$/, '')
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .trim()
    .slice(0, 60);
  return `${base || 'adjunto'}.${ext}`;
}

/** El formulario de Soporte del panel: no se guarda, sale por correo al
 * equipo, con respuesta directa a quien lo envió. */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async send(
    dto: CreateSupportRequestDto,
    user: JwtPayload,
    file: Express.Multer.File | undefined,
  ): Promise<{ ok: true }> {
    const attachments = file?.buffer?.length ? [this.attachment(file)] : [];
    const to =
      this.config.get<string>('SUPPORT_EMAIL')?.trim() || DEFAULT_SUPPORT_EMAIL;
    const typeLabel = supportRequestTypeLabel(dto.type);

    const rows: [string, string][] = [
      ['Nombre', dto.fullName],
      ['Correo de contacto', dto.email],
      ['Tipo de solicitud', typeLabel],
      ['Asunto', dto.subject],
      ['Cuenta', `${user.email} · usuario ${user.sub} · ${user.role}`],
      ['Adjunto', attachments[0]?.name ?? 'Sin adjunto'],
    ];
    const html = `
      <h2>Nueva solicitud de soporte</h2>
      <table cellpadding="6">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`,
          )
          .join('')}
      </table>
      <h3>Mensaje</h3>
      <p style="white-space:pre-line">${escapeHtml(dto.message)}</p>`;

    const sent = await this.mail.send({
      to,
      subject: `[Soporte · ${typeLabel}] ${dto.subject}`,
      html,
      replyTo: dto.email,
      attachments,
    });
    if (!sent) {
      this.logger.error(
        `Solicitud de soporte de ${user.sub} no enviada a ${to}`,
      );
      // 503: que el profesional no crea que salió y lo intente de nuevo o escriba directo.
      throw new ServiceUnavailableException(
        `No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos o escríbenos a ${DEFAULT_SUPPORT_EMAIL}.`,
      );
    }
    return { ok: true };
  }

  private attachment(file: Express.Multer.File) {
    const kind = attachmentKind(file.buffer);
    if (!kind) {
      throw new BadRequestException(
        'El adjunto debe ser una imagen (PNG, JPG o WEBP) o un PDF.',
      );
    }
    return {
      name: safeAttachmentName(file.originalname, kind),
      content: file.buffer,
    };
  }
}
