import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SiteVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

/**
 * Verifica tokens de reCAPTCHA v2 con Google siteverify.
 * Si no hay `RECAPTCHA_SECRET_KEY`, no bloquea (útil en entornos sin clave).
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly config: ConfigService) {}

  private secret(): string | null {
    const value = this.config.get<string>('RECAPTCHA_SECRET_KEY')?.trim();
    return value || null;
  }

  /** `RECAPTCHA_ENABLED=false` lo apaga aunque haya secreto (p. ej. sin claves aún). */
  isEnabled(): boolean {
    const flag = this.config.get<string>('RECAPTCHA_ENABLED')?.trim().toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'off') return false;
    if (flag === 'true' || flag === '1' || flag === 'on') return Boolean(this.secret());
    // Sin flag explícito: solo activo si hay secreto.
    return Boolean(this.secret());
  }

  async assertValid(token: string | undefined, options?: { required?: boolean }) {
    if (!this.isEnabled()) return;

    const required = options?.required ?? false;
    const secret = this.secret();
    const trimmed = token?.trim() ?? '';

    if (!secret) {
      if (required && !trimmed) {
        throw new BadRequestException('Completa la verificación “No soy un robot”.');
      }
      return;
    }

    if (!trimmed) {
      throw new BadRequestException('Completa la verificación “No soy un robot”.');
    }

    let data: SiteVerifyResponse;
    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret,
            response: trimmed,
          }).toString(),
        },
      );
      data = (await response.json()) as SiteVerifyResponse;
    } catch (err) {
      this.logger.error(
        `No se pudo contactar siteverify: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
      );
    }

    if (!data.success) {
      const codes = data['error-codes'] ?? [];
      this.logger.warn(
        `reCAPTCHA inválido (len=${trimmed.length}): ${codes.join(', ') || 'sin detalle'}`,
      );
      throw new BadRequestException(
        'La verificación “No soy un robot” falló o expiró. Vuelve a marcarla.',
      );
    }
  }
}
