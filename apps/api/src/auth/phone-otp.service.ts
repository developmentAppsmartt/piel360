import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID } from 'node:crypto';
import {
  combinePhoneDigits,
  normalizePhoneDigits,
  splitPhoneDigits,
} from '../common/phone.util';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import type { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import type { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { INVALID_CODE_MESSAGE, OtpStore } from './otp-store.service';
import { issuePasswordResetToken } from './password-reset-token';

/** Lo que dice el SMS según para qué es el código. */
const SMS_PURPOSE_TEXT: Record<string, string> = {
  reset: 'para restablecer la contraseña',
  'password-change': 'para cambiar la contraseña',
};

type StoredPhoneCode = {
  code: string;
  attempts: number;
  purpose?: string;
  userId?: string;
};

/**
 * Códigos de 5 dígitos por SMS — Altiria no tiene ningún recurso de OTP nativo
 * (confirmado contra la spec oficial), solo envío de SMS: el código lo
 * generamos y guardamos nosotros, igual que el de correo (EmailOtpService).
 *
 * En la recuperación (`reset`) aplica lo mismo que en el correo: no se puede
 * saber si el teléfono está registrado ni por el mensaje de error ni por lo
 * que tarda la respuesta, así que el SMS sale sin esperar al proveedor.
 */
@Injectable()
export class PhoneOtpService {
  private readonly logger = new Logger(PhoneOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly store: OtpStore,
  ) {}

  async send(
    dto: SendPhoneOtpDto,
    exceptUserId?: bigint,
  ): Promise<{ ok: true }> {
    const phone = normalizePhoneDigits(dto.phone);
    const purpose = dto.purpose ?? 'register';

    if (purpose === 'reset') {
      // Anti-enumeración: no revelar si el teléfono existe (o está ambiguo).
      if (await this.findUniqueUserByPhoneDigits(phone)) {
        this.textCode(phone, { purpose }).catch((error: unknown) =>
          this.logger.error('No se pudo enviar el SMS de recuperación', error),
        );
      }
      return { ok: true };
    }

    const existing = await this.prisma.user.findFirst({ where: { phone } });
    if (existing && (!exceptUserId || existing.id !== exceptUserId)) {
      throw new ConflictException('Ya existe una cuenta con ese teléfono');
    }
    await this.textCode(phone, { purpose });
    return { ok: true };
  }

  async verify(
    dto: VerifyPhoneOtpDto,
  ): Promise<{ ok: true; ticket?: string; token?: string }> {
    const phone = normalizePhoneDigits(dto.phone);
    const purpose = dto.purpose ?? 'register';
    await this.store.verifyCode<StoredPhoneCode>(
      this.codeKey(phone),
      dto.code,
      {
        generic: purpose === 'reset',
      },
    );

    if (purpose === 'reset') {
      // Evita resetear otra cuenta cuando hay teléfonos duplicados o el
      // número solo vive en patients.phone (desfase histórico).
      const user = await this.findUniqueUserByPhoneDigits(phone);
      if (!user?.email) throw new BadRequestException(INVALID_CODE_MESSAGE);
      return {
        ok: true,
        token: await issuePasswordResetToken(this.prisma, user.email),
      };
    }

    return { ok: true, ticket: await this.issueTicket(phone) };
  }

  /** Cambio de contraseña con sesión: el código queda atado al usuario, así
   * que no sirve el flujo público por teléfono (hacía findFirst y podía
   * resetear otra cuenta si el número estaba duplicado). */
  async sendForPasswordChange(
    user: { id: bigint },
    rawPhone: string | undefined,
  ): Promise<{ ok: true }> {
    const phone = this.assertPhone(rawPhone);
    const taken = await this.prisma.user.findFirst({
      where: { phone, NOT: { id: user.id } },
    });
    if (taken)
      throw new ConflictException('Ya existe una cuenta con ese teléfono');

    await this.textCode(phone, {
      purpose: 'password-change',
      userId: String(user.id),
    });
    return { ok: true };
  }

  async verifyForPasswordChange(
    user: { id: bigint; email: string },
    rawPhone: string | undefined,
    code: string,
  ): Promise<{ ok: true; token: string; phoneTicket: string }> {
    const phone = this.assertPhone(rawPhone);
    await this.store.verifyCode<StoredPhoneCode>(this.codeKey(phone), code, {
      accept: (stored) =>
        stored.purpose === 'password-change' &&
        stored.userId === String(user.id),
    });

    const token = await issuePasswordResetToken(this.prisma, user.email);
    // Siempre devolver ticket en canal SMS: sincroniza users.phone con
    // patients/doctors (había perfiles con el número solo en una tabla).
    return { ok: true, token, phoneTicket: await this.issueTicket(phone) };
  }

  async assertTicket(ticket: string, phone: string): Promise<void> {
    const storedPhone = await this.store.readTicket(this.ticketKey(ticket));
    if (
      !storedPhone ||
      normalizePhoneDigits(storedPhone) !== normalizePhoneDigits(phone)
    ) {
      throw new BadRequestException(
        'Debes verificar tu teléfono con el código enviado por SMS antes de registrarte',
      );
    }
  }

  async consumeTicket(ticket: string, phone: string): Promise<void> {
    await this.assertTicket(ticket, phone);
    await this.store.deleteKey(this.ticketKey(ticket));
  }

  private assertPhone(rawPhone: string | undefined): string {
    const phone = normalizePhoneDigits(rawPhone ?? '');
    if (!/^\d{10,15}$/.test(phone)) {
      throw new BadRequestException(
        'Indica el celular con indicativo de país (solo dígitos).',
      );
    }
    return phone;
  }

  private async textCode(
    phone: string,
    extra: { purpose: string; userId?: string },
  ): Promise<void> {
    const code = String(randomInt(10000, 100000));
    await this.store.saveCode(this.codeKey(phone), code, extra);
    const motivo = SMS_PURPOSE_TEXT[extra.purpose] ?? 'de verificación';
    await this.sms.sendSms(
      phone,
      `Tu código ${motivo} Piel360 es: ${code}. Expira en 10 minutos.`,
    );

    if (!this.config.get<string>('ALTIRIA_API_KEY')) {
      console.warn(`[OTP phone ${extra.purpose}] ${phone} → ${code}`);
    }
  }

  private async issueTicket(phone: string): Promise<string> {
    const ticket = randomUUID();
    await this.store.issueTicket(this.ticketKey(ticket), phone);
    return ticket;
  }

  /**
   * Usuario dueño del teléfono, o null si no hay uno claro.
   * Mira `users.phone` y, si hace falta, `patients.area_code` + `patients.phone`.
   */
  private async findUniqueUserByPhoneDigits(
    digits: string,
  ): Promise<{ id: bigint; email: string } | null> {
    const byUserPhone = await this.prisma.user.findMany({
      where: { phone: digits },
      select: { id: true, email: true },
    });
    if (byUserPhone.length === 1) return byUserPhone[0];
    if (byUserPhone.length > 1) return null;

    const { phone: national } = splitPhoneDigits(digits);
    if (!national) return null;

    const patients = await this.prisma.patient.findMany({
      where: { phone: national },
      select: {
        areaCode: true,
        phone: true,
        user: { select: { id: true, email: true } },
      },
    });

    const matched = patients
      .filter((p) => {
        if (!p.user?.email) return false;
        const combined = combinePhoneDigits(p.areaCode, p.phone);
        return combined === digits || p.phone === digits;
      })
      .map((p) => p.user!)
      // Un mismo user_id no debe repetirse.
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

    return matched.length === 1 ? matched[0] : null;
  }

  private codeKey(phone: string) {
    return `otp:phone:${phone}`;
  }

  private ticketKey(ticket: string) {
    return `otp-ticket:phone:${ticket.trim()}`;
  }
}
