import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderBrandedEmail } from './mail-template.util';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

interface EmailAddress {
  name?: string;
  email: string;
}

/** Convierte `"Piel360 <no-reply@piel360.com>"` (o un email plano) al shape
 * `{ name?, email }` que espera la API de Brevo. */
function parseFromAddress(raw: string): EmailAddress {
  const match = /^(.*)<(.+)>$/.exec(raw.trim());
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const email = match[2].trim();
    return name ? { name, email } : { email };
  }
  return { email: raw.trim() };
}

/** Cliente mínimo de la API HTTP de Brevo (sin SDK — un solo endpoint). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send({ to, subject, html }: SendMailInput): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const from = parseFromAddress(
      this.config.get<string>('MAIL_FROM') ?? 'Piel360 <no-reply@piel360.com>',
    );

    if (!apiKey) {
      this.logger.warn(
        `BREVO_API_KEY no configurado — email a ${to} no enviado (asunto: ${subject})`,
      );
      return;
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const htmlContent = renderBrandedEmail({ frontendUrl, bodyHtml: html });

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Brevo respondió ${response.status}: ${body}`);
    }
  }
}
