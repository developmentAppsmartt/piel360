import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Confirmado por el correo de aprovisionamiento de Altiria y por la
 * especificación técnica REST oficial (v1.9, §2.1): esta es la URL base de
 * esta cuenta, no la de docs/otpDocumentation.md (api.altiria.com —
 * aparentemente un producto/portal distinto). Configurable por si cambia. */
const ALTIRIA_DEFAULT_BASE_URL = 'https://www.altiria.net:8443/apirest/ws';

interface SendSmsResponse {
  status: string;
}

/** Cliente mínimo de la API REST JSON de Altiria — solo envío de SMS
 * (recurso /sendSms, §2.3.1 de la spec). Esta cuenta no tiene ningún recurso
 * de OTP nativo: el código lo generamos y validamos nosotros (ver
 * AuthService#sendPhoneOtp/verifyPhoneOtp, mismo patrón que el OTP de
 * email) y lo entregamos por SMS con este método. */
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

  private credentials(): { apiKey: string; apiSecret: string } | null {
    const apiKey = this.config.get<string>('ALTIRIA_API_KEY');
    const apiSecret = this.config.get<string>('ALTIRIA_API_SECRET');
    if (!apiKey || !apiSecret) return null;
    return { apiKey, apiSecret };
  }

  /** Envía un SMS de texto plano al teléfono (formato internacional, solo
   * dígitos, sin "+" — ver SendPhoneOtpDto). */
  async sendSms(phone: string, message: string): Promise<void> {
    const credentials = this.credentials();
    if (!credentials) {
      this.logger.warn(
        `ALTIRIA_API_KEY/ALTIRIA_API_SECRET no configurados — SMS a ${phone} no enviado (modo dev): "${message}"`,
      );
      return;
    }

    const response = await fetch(`${this.baseUrl()}/sendSms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        credentials,
        destination: [phone],
        message: { msg: message },
      }),
    });

    const body = (await response.json().catch(() => null)) as
      SendSmsResponse | { error: unknown } | null;

    // "000" = éxito (ver §2.3.4). Cualquier otro status, o un cuerpo sin
    // "status" (p. ej. `{"error": ...}` — errores de sintaxis/binding),
    // se trata como fallo.
    if (!response.ok || !body || (body as SendSmsResponse).status !== '000') {
      this.logger.error(
        `Altiria sendSms respondió ${response.status}: ${JSON.stringify(body)}`,
      );
      throw new BadGatewayException('No se pudo enviar el SMS de verificación');
    }
  }
}
