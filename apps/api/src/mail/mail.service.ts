import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/** Cliente mínimo de la API HTTP de Resend (sin SDK — un solo endpoint). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send({ to, subject, html }: SendMailInput): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from =
      this.config.get<string>('MAIL_FROM') ??
      'Piel360 <no-reply@piel360.local>';

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY no configurado — email a ${to} no enviado (asunto: ${subject})`,
      );
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend respondió ${response.status}: ${body}`);
    }
  }
}
