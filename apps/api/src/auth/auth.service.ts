import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  SEAT_PLAN_LIMITS,
  type MembershipType,
  type Role,
} from '@piel360/shared';
import * as argon2 from 'argon2';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDoctorDto } from './dto/register-doctor.dto';
import type { RegisterPatientDto } from './dto/register-patient.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import type { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import type { GoogleProfile } from './google.strategy';
import type { JwtPayload } from './types';

/** TTL del código de intercambio de Google OAuth: solo debe vivir el tiempo
 * del redirect navegador → API → front (segundos). */
const GOOGLE_EXCHANGE_TTL_SECONDS = 60;

/** TTL del token de recuperación de contraseña. */
const PASSWORD_RESET_TTL_MINUTES = 30;

/** OTP de 5 dígitos (registro / reset). */
const OTP_TTL_SECONDS = 10 * 60;
const OTP_TICKET_TTL_SECONDS = 15 * 60;
const OTP_MAX_ATTEMPTS = 5;

const ROLE_PRIORITY: Role[] = ['superadmin', 'monitor', 'doctor', 'patient'];

interface AuthUser {
  id: bigint;
  email: string;
  name: string;
  roles: { name: string; permissions: { name: string }[] }[];
  patient?: { surveyCompletedAt: Date | null } | null;
  doctor?: {
    empresa: boolean;
    empresaReferida: boolean;
    verificationStatus: string;
  } | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string;
  };
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  async registerDoctor(dto: RegisterDoctorDto): Promise<AuthResult> {
    if (dto.phoneTicket) {
      await this.consumePhoneTicket(dto.phoneTicket, dto.phone);
    }
    await this.assertEmailAvailable(dto.email);
    const password = await argon2.hash(dto.password);
    const membershipType: MembershipType =
      dto.membershipType ?? 'solo_doctor';
    const empresa =
      membershipType === 'empresa' || membershipType === 'empresa_aliada';
    const empresaReferida = membershipType === 'empresa_aliada';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        name: `${dto.firstName} ${dto.lastName}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        phoneVerifiedAt: dto.phoneTicket ? new Date() : null,
        roles: { connect: { name: 'doctor' } },
        doctor: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            membershipType,
            empresa,
            empresaReferida,
            verificationStatus: 'pending',
            docType: dto.docType?.trim() || null,
            docNumber: dto.docNumber?.trim() || null,
            gender: dto.gender?.trim() || null,
            ...(dto.birthDate
              ? { birthDate: new Date(dto.birthDate) }
              : {}),
            specialty: dto.specialty?.trim() || null,
            medicalRegistry: dto.medicalRegistry?.trim() || null,
            licenseNumber: dto.licenseNumber?.trim() || null,
            educationEntity: dto.educationEntity?.trim() || null,
            graduationInstitution: dto.graduationInstitution?.trim() || null,
            address: dto.address?.trim() || null,
            city: dto.city?.trim() || null,
            country: dto.country?.trim() || null,
            ...(dto.lat != null && dto.lng != null
              ? { lat: dto.lat, lng: dto.lng }
              : {}),
          },
        },
      },
      include: {
        roles: { include: { permissions: true } },
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (empresa) {
      const referralCode = empresaReferida
        ? this.generateReferralCode()
        : null;
      const orgName = `Clínica ${dto.firstName} ${dto.lastName}`.trim();
      const orgType = empresaReferida ? 'empresa_aliada' : 'empresa';

      await this.prisma.organization.create({
        data: {
          type: orgType,
          name: orgName,
          ownerUserId: user.id,
          seatPlan: 'two',
          seatLimit: SEAT_PLAN_LIMITS.two,
          referralCode,
          status: 'pending',
          members: {
            create: {
              userId: user.id,
              memberRole: 'owner',
            },
          },
          ...(referralCode
            ? {
                referrals: {
                  create: { code: referralCode },
                },
              }
            : {}),
        },
      });
    }

    const role = this.resolveRole(user);
    return this.buildAuthResult(user, role);
  }

  private generateReferralCode(): string {
    return `ALI-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async registerPatient(dto: RegisterPatientDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const emailTicket = dto.emailTicket?.trim();
    if (emailTicket) {
      await this.consumeRegisterTicket(emailTicket, email);
    }
    await this.consumePhoneTicket(dto.phoneTicket, dto.phone);

    await this.assertEmailAvailable(email);
    const password = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        name: `${dto.firstName} ${dto.lastName}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        // Solo se marca verificado si hubo ticket OTP.
        emailVerifiedAt: emailTicket ? new Date() : null,
        phone: dto.phone,
        phoneVerifiedAt: new Date(),
        roles: { connect: { name: 'patient' } },
        patient: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email,
          },
        },
      },
      include: { roles: { include: { permissions: true } }, patient: true },
    });

    return this.buildAuthResult(user, 'patient');
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: { include: { permissions: true } },
        patient: true,
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!user || !(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const role = this.resolveRole(user);
    return this.buildAuthResult(user, role);
  }

  /**
   * Crea o loguea un usuario vía Google. Regla de seguridad (MIGRACION.md §2.2):
   * el rol `doctor` NUNCA se auto-asigna a una cuenta ya existente — solo se
   * asigna en el registro inicial. `patient` sí puede agregarse a una cuenta
   * existente que aún no lo tenga (ej. un doctor que también quiere auto-analizarse).
   */
  async loginOrRegisterWithGoogle(profile: GoogleProfile): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: {
        roles: { include: { permissions: true } },
        patient: true,
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!existing) {
      const roleIntent: Role =
        profile.roleIntent === 'doctor' ? 'doctor' : 'patient';
      const randomPassword = await argon2.hash(randomBytes(32).toString('hex'));

      const user = await this.prisma.user.create({
        data: {
          email: profile.email,
          password: randomPassword,
          googleId: profile.googleId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          firstName: profile.firstName,
          lastName: profile.lastName,
          roles: { connect: { name: roleIntent } },
          ...(roleIntent === 'doctor'
            ? {
                doctor: {
                  create: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                  },
                },
              }
            : {
                patient: {
                  create: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                  },
                },
              }),
        },
        include: {
          roles: { include: { permissions: true } },
          patient: true,
          doctor: {
            select: {
              empresa: true,
              empresaReferida: true,
              verificationStatus: true,
            },
          },
        },
      });

      return this.buildAuthResult(user, roleIntent);
    }

    const roleNames = existing.roles.map((r) => r.name);
    const updateData: {
      googleId?: string;
      roles?: { connect: { name: string } };
      patient?: {
        create: { firstName: string; lastName: string; email: string };
      };
    } = {};

    if (!existing.googleId) updateData.googleId = profile.googleId;

    const wantsPatient = profile.roleIntent === 'patient';
    const alreadyPatient = roleNames.includes('patient');
    if (wantsPatient && !alreadyPatient) {
      updateData.roles = { connect: { name: 'patient' } };
      if (!existing.patient) {
        updateData.patient = {
          create: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
          },
        };
      }
    }

    const user =
      Object.keys(updateData).length > 0
        ? await this.prisma.user.update({
            where: { id: existing.id },
            data: updateData,
            include: {
              roles: { include: { permissions: true } },
              patient: true,
              doctor: {
                select: {
                  empresa: true,
                  empresaReferida: true,
                  verificationStatus: true,
                },
              },
            },
          })
        : existing;

    const role = this.resolveRole(user);
    return this.buildAuthResult(user, role);
  }

  /** Guarda el resultado de auth bajo un código de un solo uso (Redis, TTL
   * corto) para poder redirigir al front sin exponer los JWT en la URL. */
  async createGoogleExchangeCode(result: AuthResult): Promise<string> {
    const code = randomUUID();
    await this.redis.set(
      `google-exchange:${code}`,
      JSON.stringify(result),
      'EX',
      GOOGLE_EXCHANGE_TTL_SECONDS,
    );
    return code;
  }

  async exchangeGoogleCode(code: string): Promise<AuthResult> {
    const key = `google-exchange:${code}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new UnauthorizedException('Código inválido o expirado');
    await this.redis.del(key);
    return JSON.parse(raw) as AuthResult;
  }

  /** Siempre responde OK (no revela si el email existe — evita enumeración de cuentas). */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000,
      );

      await this.prisma.passwordResetToken.create({
        data: { email: dto.email, token, expiresAt },
      });

      const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
      await this.mail.send({
        to: dto.email,
        subject: 'Restablecer contraseña — Piel360',
        html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace (expira en ${PASSWORD_RESET_TTL_MINUTES} minutos):</p><p><a href="${frontendUrl}/reset-password?token=${token}">Restablecer contraseña</a></p>`,
      });
    }

    return { ok: true };
  }

  /**
   * Envía un OTP de 5 dígitos.
   * - `register`: el email no debe existir.
   * - `reset`: si el email no existe, responde OK igual (anti-enumeración).
   */
  async sendOtp(dto: SendOtpDto): Promise<{ ok: true }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (dto.purpose === 'register' && user) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    if (dto.purpose === 'reset' && !user) {
      return { ok: true };
    }

    const code = String(randomInt(10000, 100000));
    const key = this.otpKey(dto.purpose, email);
    await this.ensureRedis();
    await this.redis.set(
      key,
      JSON.stringify({ code, attempts: 0 }),
      'EX',
      OTP_TTL_SECONDS,
    );

    await this.mail.send({
      to: email,
      subject:
        dto.purpose === 'register'
          ? 'Código de verificación — Piel360'
          : 'Código para restablecer contraseña — Piel360',
      html: `<p>Tu código de 5 dígitos es:</p><p style="font-size:24px;letter-spacing:4px"><strong>${code}</strong></p><p>Expira en 10 minutos.</p>`,
    });

    if (!this.config.get<string>('RESEND_API_KEY')) {
      // Local/dev sin Resend: deja el código en logs del API.

      console.warn(`[OTP ${dto.purpose}] ${email} → ${code}`);
    }

    return { ok: true };
  }

  /**
   * Verifica el OTP.
   * - `register` → `{ ticket }` para `register/patient.emailTicket`
   * - `reset` → `{ token }` usable en `reset-password`
   */
  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ ok: true; ticket?: string; token?: string }> {
    const email = dto.email.trim().toLowerCase();
    const key = this.otpKey(dto.purpose, email);
    await this.ensureRedis();
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const stored = JSON.parse(raw) as { code: string; attempts: number };
    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException(
        'Demasiados intentos. Solicita un nuevo código.',
      );
    }

    if (stored.code !== dto.code.trim()) {
      stored.attempts += 1;
      const ttl = await this.redis.ttl(key);
      await this.redis.set(
        key,
        JSON.stringify(stored),
        'EX',
        ttl > 0 ? ttl : OTP_TTL_SECONDS,
      );
      throw new BadRequestException('Código incorrecto');
    }

    await this.redis.del(key);

    if (dto.purpose === 'register') {
      const ticket = randomUUID();
      await this.redis.set(
        this.registerTicketKey(ticket),
        email,
        'EX',
        OTP_TICKET_TTL_SECONDS,
      );
      return { ok: true, ticket };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000,
    );
    await this.prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });
    return { ok: true, token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const password = await argon2.hash(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: resetToken.email },
        data: { password },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return { ok: true };
  }

  /**
   * OTP de teléfono por SMS — Altiria no tiene ningún recurso de OTP nativo
   * (confirmado contra la spec oficial), solo envío de SMS. El código lo
   * generamos y guardamos nosotros, mismo patrón exacto que el OTP de email
   * (sendOtp/verifyOtp): 5 dígitos en Redis con intentos/expiración.
   */
  async sendPhoneOtp(dto: SendPhoneOtpDto): Promise<{ ok: true }> {
    const phone = dto.phone.trim();
    const existing = await this.prisma.user.findFirst({ where: { phone } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese teléfono');
    }

    const code = String(randomInt(10000, 100000));
    await this.ensureRedis();
    await this.redis.set(
      this.phoneOtpKey(phone),
      JSON.stringify({ code, attempts: 0 }),
      'EX',
      OTP_TTL_SECONDS,
    );

    await this.sms.sendSms(
      phone,
      `Tu código de verificación Piel360 es: ${code}. Expira en 10 minutos.`,
    );

    if (!this.config.get<string>('ALTIRIA_API_KEY')) {
      // Local/dev sin credenciales de Altiria: deja el código en logs del API.
      console.warn(`[OTP phone] ${phone} → ${code}`);
    }

    return { ok: true };
  }

  async verifyPhoneOtp(
    dto: VerifyPhoneOtpDto,
  ): Promise<{ ok: true; ticket: string }> {
    const phone = dto.phone.trim();
    const key = this.phoneOtpKey(phone);
    await this.ensureRedis();
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const stored = JSON.parse(raw) as { code: string; attempts: number };
    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException(
        'Demasiados intentos. Solicita un nuevo código.',
      );
    }

    if (stored.code !== dto.code.trim()) {
      stored.attempts += 1;
      const ttl = await this.redis.ttl(key);
      await this.redis.set(
        key,
        JSON.stringify(stored),
        'EX',
        ttl > 0 ? ttl : OTP_TTL_SECONDS,
      );
      throw new BadRequestException('Código incorrecto');
    }

    await this.redis.del(key);

    const ticket = randomUUID();
    await this.redis.set(
      this.phoneTicketKey(ticket),
      phone,
      'EX',
      OTP_TICKET_TTL_SECONDS,
    );
    return { ok: true, ticket };
  }

  private phoneOtpKey(phone: string) {
    return `otp:phone:${phone}`;
  }

  private phoneTicketKey(ticket: string) {
    return `otp-ticket:phone:${ticket}`;
  }

  private async consumePhoneTicket(ticket: string, phone: string) {
    await this.ensureRedis();
    const key = this.phoneTicketKey(ticket);
    const storedPhone = await this.redis.get(key);
    if (!storedPhone || storedPhone !== phone.trim()) {
      throw new BadRequestException(
        'Debes verificar tu teléfono con el código enviado por SMS antes de registrarte',
      );
    }
    await this.redis.del(key);
  }

  private otpKey(purpose: string, email: string) {
    return `otp:${purpose}:${email}`;
  }

  private registerTicketKey(ticket: string) {
    return `otp-ticket:register:${ticket}`;
  }

  private async consumeRegisterTicket(ticket: string, email: string) {
    await this.ensureRedis();
    const key = this.registerTicketKey(ticket);
    const storedEmail = await this.redis.get(key);
    if (!storedEmail || storedEmail !== email) {
      throw new BadRequestException(
        'Debes verificar tu correo con el código OTP antes de registrarte',
      );
    }
    await this.redis.del(key);
  }

  private async ensureRedis() {
    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { roles: true, doctor: true, patient: true },
    });

    if (!user) throw new UnauthorizedException();

    const { password: _password, ...safeUser } = user;
    void _password;
    return safeUser;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }
  }

  /** Prioridad: superadmin > monitor > doctor > patient.
   * Si ninguno calza pero tiene permisos (rol personalizado), se trata como
   * superadmin para ruteo del panel (apps/web/src/proxy.ts). */
  private resolveRole(user: AuthUser): Role {
    const names = user.roles.map((r) => r.name);
    const match = ROLE_PRIORITY.find((role) => names.includes(role));
    if (match) return match;
    if (this.resolvePermissions(user).length > 0) return 'superadmin';
    throw new UnauthorizedException('El usuario no tiene un rol asignado');
  }

  /** Unión de los permisos de todos los roles del usuario (no solo el de
   * mayor prioridad) — un usuario puede tener superadmin más un rol
   * personalizado adicional. */
  private resolvePermissions(user: AuthUser): string[] {
    const names = new Set<string>();
    for (const role of user.roles) {
      for (const permission of role.permissions) names.add(permission.name);
    }
    return Array.from(names);
  }

  private buildAuthResult(user: AuthUser, role: Role): AuthResult {
    const empresa = user.doctor?.empresa ?? false;
    const empresaReferida = user.doctor?.empresaReferida ?? false;
    const verificationStatus = user.doctor?.verificationStatus ?? 'pending';
    const doctorFlags =
      role === 'doctor'
        ? { empresa, empresaReferida, verificationStatus }
        : {};
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role,
      permissions: this.resolvePermissions(user),
      surveyCompletedAt:
        role === 'patient'
          ? (user.patient?.surveyCompletedAt?.toISOString() ?? null)
          : undefined,
      ...doctorFlags,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(
      { sub: payload.sub },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role,
        ...doctorFlags,
      },
    };
  }
}
