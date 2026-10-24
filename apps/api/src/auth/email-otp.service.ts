import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpStore } from './otp-store.service';
import {
  issuePasswordResetToken,
  PASSWORD_RESET_TTL_MINUTES,
} from './password-reset-token';

/** Mínimo entre dos envíos al mismo correo — evita spam de correos
 * (independiente del rate-limit por IP, que no frena a un atacante que
 * rota de IP contra la misma víctima). */
const OTP_RESEND_COOLDOWN_SECONDS = 30;

type Purpose = SendOtpDto['purpose'];

/**
 * Códigos de 5 dígitos por correo: registro (el correo no debe existir) y
 * recuperación de contraseña.
 *
 * La recuperación no puede revelar si un correo está registrado. Se comprobó
 * que lo hacía de tres formas: la espera entre envíos solo aplicaba a correos
 * registrados, el código equivocado decía «Código incorrecto» solo si la
 * cuenta existía, y la respuesta tardaba lo que tarda el proveedor de correo
 * solo cuando había a quién escribir. Por eso en `reset` la espera va antes de
 * buscar al usuario, todo fallo al verificar dice lo mismo y el correo se
 * envía sin esperar la respuesta del proveedor.
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly store: OtpStore,
  ) {}

  async send(dto: SendOtpDto): Promise<{ ok: true }> {
    const email = dto.email.trim().toLowerCase();
    return dto.purpose === 'reset'
      ? this.sendReset(email)
      : this.sendRegister(email);
  }

  private async sendRegister(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) throw new ConflictException('Ya existe una cuenta con ese email');
    await this.assertNotOnCooldown('register', email);
    await this.mailCode('register', email);
    return { ok: true };
  }

  private async sendReset(email: string): Promise<{ ok: true }> {
    await this.assertNotOnCooldown('reset', email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) this.inBackground(this.mailCode('reset', email));
    return { ok: true };
  }

  /**
   * - `register` → `{ ticket }` para el `emailTicket` del registro
   * - `reset` → `{ token }` usable en `reset-password`
   */
  async verify(
    dto: VerifyOtpDto,
  ): Promise<{ ok: true; ticket?: string; token?: string }> {
    const email = dto.email.trim().toLowerCase();
    await this.store.verifyCode(this.codeKey(dto.purpose, email), dto.code, {
      generic: dto.purpose === 'reset',
    });

    if (dto.purpose === 'register') {
      const ticket = randomUUID();
      await this.store.issueTicket(this.registerTicketKey(ticket), email);
      return { ok: true, ticket };
    }
    return {
      ok: true,
      token: await issuePasswordResetToken(this.prisma, email),
    };
  }

  async consumeRegisterTicket(ticket: string, email: string): Promise<void> {
    const key = this.registerTicketKey(ticket);
    const storedEmail = await this.store.readTicket(key);
    if (!storedEmail || storedEmail !== email) {
      throw new BadRequestException(
        'Debes verificar tu correo con el código OTP antes de registrarte',
      );
    }
    await this.store.deleteKey(key);
  }

  /** Recuperación por enlace (flujo anterior al código). Siempre responde OK
   * y no espera al proveedor de correo, por la misma razón que `sendReset`. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) this.inBackground(this.mailResetLink(email));
    return { ok: true };
  }

  private async assertNotOnCooldown(purpose: Purpose, email: string) {
    const onCooldown = await this.store.hitCooldown(
      `otp-cooldown:${purpose}:${email}`,
      OTP_RESEND_COOLDOWN_SECONDS,
    );
    if (onCooldown) {
      throw new BadRequestException(
        'Espera unos segundos antes de pedir otro código',
      );
    }
  }

  private async mailCode(purpose: Purpose, email: string): Promise<void> {
    const code = String(randomInt(10000, 100000));
    await this.store.saveCode(this.codeKey(purpose, email), code);
    await this.mail.send({
      to: email,
      subject:
        purpose === 'register'
          ? 'Código de verificación — Piel360'
          : 'Código para restablecer contraseña — Piel360',
      html: `<p>Tu código de verificación es:</p><p style="text-align:center;margin:20px 0;"><span style="display:inline-block;background:#1e5a9e;color:#ffffff;font-size:24px;letter-spacing:6px;font-weight:bold;padding:12px 20px;border-radius:8px;">${code}</span></p><p>Expira en 10 minutos.</p>`,
    });

    if (!this.config.get<string>('BREVO_API_KEY')) {
      // Local/dev sin Brevo: deja el código en logs del API.
      console.warn(`[OTP ${purpose}] ${email} → ${code}`);
    }
  }

  private async mailResetLink(email: string): Promise<void> {
    const token = await issuePasswordResetToken(this.prisma, email);
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    await this.mail.send({
      to: email,
      subject: 'Restablecer contraseña — Piel360',
      html: `<p>Para restablecer tu contraseña, haz clic en el siguiente botón (expira en ${PASSWORD_RESET_TTL_MINUTES} minutos):</p><p style="text-align:center;margin:24px 0;"><a href="${frontendUrl}/reset-password?token=${token}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Restablecer contraseña</a></p>`,
    });
  }

  /** Un fallo del proveedor solo queda en el log: si llegara a la respuesta,
   * delataría que el correo existe. */
  private inBackground(envio: Promise<void>): void {
    envio.catch((error: unknown) =>
      this.logger.error('No se pudo enviar el correo de recuperación', error),
    );
  }

  private codeKey(purpose: Purpose, email: string) {
    return `otp:${purpose}:${email}`;
  }

  private registerTicketKey(ticket: string) {
    return `otp-ticket:register:${ticket}`;
  }
}
