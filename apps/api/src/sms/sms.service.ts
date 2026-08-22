import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Confirmado por el correo de aprovisionamiento de Altiria y por la
 * especificación técnica REST (§2.1): la URL base de esta cuenta es esta,
 * no la de docs/otpDocumentation.md (api.altiria.com — aparentemente un
 * portal/versión distinta). Configurable igual por si vuelve a cambiar. */
const ALTIRIA_DEFAULT_BASE_URL = 'https://www.altiria.net:8443/apirest/ws';

/** Cliente mínimo de la API HTTP de Altiria (OTP nativo — generate/check),
 * mismo criterio que MailService: sin SDK, un fetch por llamada. */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('ALTIRIA_API_BASE_URL') ??
      ALTIRIA_DEFAULT_BASE_URL
    );
  }

  private authHeader(): string | null {
    const key = this.config.get<string>('ALTIRIA_API_KEY');
    const secret = this.config.get<string>('ALTIRIA_API_SECRET');
    if (!key || !secret) return null;
    return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
  }

  /** Genera y envía el código OTP al teléfono. Altiria gestiona código,
   * expiración e intentos por su lado — no guardamos nada nosotros. */
  async generateOtp(phone: string): Promise<void> {
    const auth = this.authHeader();
    if (!auth) {
      this.logger.warn(
        `ALTIRIA_API_KEY/ALTIRIA_API_SECRET no configurados — OTP a ${phone} no enviado (modo dev)`,
      );
      return;
    }

    const response = await fetch(`${this.baseUrl()}/otp/generate`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ recipient: phone }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Altiria otp/generate respondió ${response.status}: ${body}`,
      );
      throw new BadGatewayException(
        'No se pudo enviar el código de verificación',
      );
    }
  }

  /** Valida el código ingresado contra el estado que mantiene Altiria. */
  async checkOtp(phone: string, code: string): Promise<boolean> {
    const auth = this.authHeader();
    if (!auth) {
      this.logger.warn(
        `ALTIRIA_API_KEY/ALTIRIA_API_SECRET no configurados — se acepta cualquier código para ${phone} (modo dev, NO usar así en producción)`,
      );
      return true;
    }

    const response = await fetch(`${this.baseUrl()}/otp/check`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ recipient: phone, code }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Altiria otp/check respondió ${response.status}: ${body}`,
      );
      return false;
    }

    const data = (await response.json()) as { data?: { valid?: boolean } };
    return data.data?.valid === true;
  }
}
