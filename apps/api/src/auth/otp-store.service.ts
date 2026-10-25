import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/** OTP de 5 dígitos (correo y SMS). */
const OTP_TTL_SECONDS = 10 * 60;
const OTP_TICKET_TTL_SECONDS = 60 * 60;
const OTP_MAX_ATTEMPTS = 5;

/** El único mensaje de un código de recuperación que falla: si «Código
 * incorrecto» y «Código inválido o expirado» se distinguen, escribir un código
 * cualquiera basta para saber si la cuenta existe (solo las que existen tienen
 * un código guardado). */
export const INVALID_CODE_MESSAGE = 'Código inválido o expirado';

type StoredCode = { code: string; attempts: number };

/**
 * Los códigos y tickets de un solo uso en Redis: guardar, verificar con tope de
 * intentos, espera entre envíos. Antes la verificación estaba copiada tres
 * veces dentro de AuthService (correo, SMS y cambio de contraseña).
 */
@Injectable()
export class OtpStore implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private async client(): Promise<Redis> {
    if (this.redis.status === 'wait') await this.redis.connect();
    return this.redis;
  }

  async saveCode(
    key: string,
    code: string,
    extra: Record<string, string> = {},
  ): Promise<void> {
    const redis = await this.client();
    await redis.set(
      key,
      JSON.stringify({ code, attempts: 0, ...extra }),
      'EX',
      OTP_TTL_SECONDS,
    );
  }

  /**
   * Comprueba el código y lo consume si coincide. `generic` hace que todo
   * fallo diga lo mismo (recuperación de contraseña); `accept` descarta un
   * código guardado para otro propósito o usuario.
   */
  async verifyCode<T extends StoredCode>(
    key: string,
    code: string,
    options: { generic?: boolean; accept?: (stored: T) => boolean } = {},
  ): Promise<T> {
    const redis = await this.client();
    const fail = (specific: string) =>
      new BadRequestException(
        options.generic ? INVALID_CODE_MESSAGE : specific,
      );

    const raw = await redis.get(key);
    if (!raw) throw new BadRequestException(INVALID_CODE_MESSAGE);

    const stored = JSON.parse(raw) as T;
    if (options.accept && !options.accept(stored)) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      await redis.del(key);
      throw fail('Demasiados intentos. Solicita un nuevo código.');
    }

    if (stored.code !== code.trim()) {
      stored.attempts += 1;
      const ttl = await redis.ttl(key);
      await redis.set(
        key,
        JSON.stringify(stored),
        'EX',
        ttl > 0 ? ttl : OTP_TTL_SECONDS,
      );
      throw fail('Código incorrecto');
    }

    await redis.del(key);
    return stored;
  }

  /** `true` si ya había una espera en curso; si no, la empieza. */
  async hitCooldown(key: string, seconds: number): Promise<boolean> {
    const redis = await this.client();
    const started = await redis.set(key, '1', 'EX', seconds, 'NX');
    return started === null;
  }

  async issueTicket(key: string, value: string): Promise<void> {
    const redis = await this.client();
    await redis.set(key, value, 'EX', OTP_TICKET_TTL_SECONDS);
  }

  async readTicket(key: string): Promise<string | null> {
    const redis = await this.client();
    return redis.get(key);
  }

  async deleteKey(key: string): Promise<void> {
    const redis = await this.client();
    await redis.del(key);
  }
}
