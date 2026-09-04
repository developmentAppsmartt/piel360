import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  isMobileLoginAllowed,
  OAUTH_DOCTOR_DEFAULT_ROLE,
  OAUTH_DOCTOR_DEFAULT_SPECIALTY,
  parseTeamMemberPermissions,
  resolveUserPrimaryPanel,
  TEAM_MEMBER_PERMISSIONS,
  SEAT_PLAN_LIMITS,
  type MembershipType,
  type PrimaryPanel,
  type Role,
  type TeamMemberPermission,
} from '@piel360/shared';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { assertDocumentNumberAvailable } from '../common/document-number.util';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDoctorDto } from './dto/register-doctor.dto';
import type { RegisterEmpresaDto } from './dto/register-empresa.dto';
import type { RegisterPatientDto } from './dto/register-patient.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
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
const OTP_TICKET_TTL_SECONDS = 60 * 60;
const OTP_MAX_ATTEMPTS = 5;

const ROLE_PRIORITY: Role[] = ['superadmin', 'monitor', 'empresa', 'doctor', 'patient'];

interface AuthUser {
  id: bigint;
  email: string;
  name: string;
  roles: {
    name: string;
    isActive: boolean;
    primaryPanel?: string | null;
    permissions: { name: string; slug: string; isActive: boolean }[];
  }[];
  patient?: { surveyCompletedAt: Date | null } | null;
  doctor?: {
    empresa: boolean;
    empresaReferida: boolean;
    verificationStatus: string;
  } | null;
  organizationMembers?: {
    memberRole: string;
    permissions: unknown;
  }[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    primaryPanel?: PrimaryPanel;
    permissions?: string[];
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string;
    teamPermissions?: TeamMemberPermission[] | null;
    organizationMemberRole?: 'owner' | 'member' | null;
    isOrgMember?: boolean;
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
    private readonly specialtyAccess: SpecialtyAccessService,
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

  async registerDoctor(
    dto: RegisterDoctorDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const phone = this.normalizePhoneDigits(dto.phone);
    if (dto.phoneTicket) {
      await this.assertPhoneTicket(dto.phoneTicket, phone);
    }
    await this.assertEmailAvailable(email);
    await assertDocumentNumberAvailable(this.prisma, dto.docNumber);
    const password = await argon2.hash(dto.password);
    const membershipType: MembershipType = 'solo_doctor';

    const professionalRoleSlug =
      await this.specialtyAccess.assertProfessionalRoleSlug(dto.specialty);

    let user: AuthUser;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          password,
          name: `${dto.firstName} ${dto.lastName}`,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone,
          phoneVerifiedAt: dto.phoneTicket ? new Date() : null,
          roles: {
            connect: [{ name: professionalRoleSlug }],
          },
          doctor: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone,
              membershipType,
              empresa: false,
              empresaReferida: false,
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
              department: dto.department?.trim() || null,
              country: dto.country?.trim() || null,
              locationType: dto.locationType?.trim() || null,
              ...(dto.lat != null && dto.lng != null
                ? {
                    lat: dto.lat,
                    lng: dto.lng,
                    addressVerificationStatus:
                      dto.address?.trim() ? 'in_review' : 'pending',
                  }
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BadRequestException(
          'El perfil profesional seleccionado no está configurado correctamente. Contacta al administrador.',
        );
      }
      throw error;
    }

    if (dto.phoneTicket) {
      await this.consumePhoneTicket(dto.phoneTicket, phone);
    }

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client);
  }

  async registerEmpresa(
    dto: RegisterEmpresaDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const phone = this.normalizePhoneDigits(dto.phone);
    if (!dto.phoneTicket?.trim()) {
      throw new BadRequestException(
        'Debes verificar tu teléfono con el código enviado por SMS antes de registrarte',
      );
    }
    await this.assertPhoneTicket(dto.phoneTicket, phone);
    await this.assertEmailAvailable(dto.email);
    await assertDocumentNumberAvailable(this.prisma, dto.legalRepDocNumber);
    const password = await argon2.hash(dto.password);

    const membershipType = dto.membershipType;
    const empresaReferida = membershipType === 'empresa_aliada';
    const legalRepName = dto.legalRepName.trim();
    const nameParts = legalRepName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? legalRepName;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;
    const referralCode = empresaReferida ? this.generateReferralCode() : null;
    const orgType = empresaReferida ? 'empresa_aliada' : 'empresa';
    const address = dto.address.trim();

    const empresaRole = await this.prisma.role.findUnique({
      where: { name: 'empresa' },
    });
    if (!empresaRole) {
      throw new BadRequestException(
        'El rol de empresa no está configurado en el sistema. Contacta al administrador.',
      );
    }

    let created: AuthUser;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            password,
            name: legalRepName,
            firstName,
            lastName,
            phone,
            phoneVerifiedAt: new Date(),
            roles: { connect: [{ name: 'empresa' }] },
          doctor: {
            create: {
              firstName,
              lastName,
              phone,
              membershipType,
              empresa: true,
              empresaReferida,
              verificationStatus: 'pending',
              docType: dto.legalRepDocType?.trim() || null,
              docNumber: dto.legalRepDocNumber.trim(),
              address,
              city: dto.city?.trim() || null,
              department: dto.department?.trim() || null,
              country: dto.country?.trim() || 'CO',
              ...(dto.lat != null && dto.lng != null
                ? {
                    lat: dto.lat,
                    lng: dto.lng,
                    addressVerificationStatus: address ? 'in_review' : 'pending',
                  }
                : {}),
              locationType: empresaReferida ? 'empresa_aliada' : 'clinica',
              // Sin especialidad: la cuenta es empresa, no profesional individual.
              specialty: null,
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

      await tx.user.update({
        where: { id: newUser.id },
        data: {
          roles: { set: [{ name: 'empresa' }] },
        },
      });

      await tx.organization.create({
        data: {
          type: orgType,
          name: dto.organizationName.trim(),
          ownerUserId: newUser.id,
          seatPlan: 'two',
          seatLimit: SEAT_PLAN_LIMITS.two,
          referralCode,
          status: 'pending',
          ciiuCode: dto.ciiuCode?.trim() || null,
          businessEmail: dto.businessEmail?.trim() || null,
          businessPhone: dto.businessPhone?.trim() || null,
          website: dto.website?.trim() || null,
          employeeCountRange: dto.employeeCountRange?.trim() || null,
          legalRepName,
          legalRepDocType: dto.legalRepDocType?.trim() || null,
          legalRepDocNumber: dto.legalRepDocNumber.trim(),
          address,
          city: dto.city?.trim() || null,
          department: dto.department?.trim() || null,
          country: dto.country?.trim() || 'CO',
          ...(dto.lat != null && dto.lng != null
            ? { lat: dto.lat, lng: dto.lng }
            : {}),
          members: {
            create: {
              userId: newUser.id,
              memberRole: 'owner',
            },
          },
          ...(referralCode
            ? { referrals: { create: { code: referralCode } } }
            : {}),
        },
      });

      return newUser;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BadRequestException(
          'No se pudo asignar el rol de empresa. Contacta al administrador.',
        );
      }
      throw error;
    }

    await this.consumePhoneTicket(dto.phoneTicket, phone);

    const session = this.resolveSessionContext(created);
    return this.buildAuthResult(created, session, client);
  }

  private generateReferralCode(): string {
    return `ALI-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async registerPatient(
    dto: RegisterPatientDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const emailTicket = dto.emailTicket?.trim();
    if (emailTicket) {
      await this.consumeRegisterTicket(emailTicket, email);
    }
    const phone = this.normalizePhoneDigits(dto.phone);
    await this.assertPhoneTicket(dto.phoneTicket, phone);

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
        phone,
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

    await this.consumePhoneTicket(dto.phoneTicket, phone);

    return this.buildAuthResult(
      user,
      {
        role: 'patient',
        primaryPanel: 'patient',
        roleSlugs: ['patient'],
        permissions: this.resolvePermissions(user),
        teamPermissions: null,
        organizationMemberRole: null,
        isOrgMember: false,
      },
      client,
    );
  }

  async login(
    dto: LoginDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.password?.trim()) {
      throw new UnauthorizedException(
        'Esta cuenta usa inicio con Google. Continúa con Google.',
      );
    }
    if (!(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client);
  }

  /** Canjea el refresh token (cookie `piel360_refresh` en web, body en móvil)
   * por un access token nuevo — el mecanismo de "sesión larga" del que solo
   * existía la mitad (se emitía el refresh token pero nada lo consumía). */
  async refreshTokens(
    refreshToken: string,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    let sub: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(
        refreshToken,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException('Sesión expirada, inicia sesión de nuevo');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(sub) },
      include: this.authUserInclude,
    });
    if (!user) throw new UnauthorizedException();

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client);
  }

  /** Include común para construir `AuthUser` (login/refresh) — roles+permisos
   * para `resolvePermissions`, y los campos de doctor/paciente que necesita
   * `buildAuthResult`. */
  private readonly authUserInclude = {
    roles: { include: { permissions: true } },
    patient: true,
    doctor: {
      select: {
        empresa: true,
        empresaReferida: true,
        verificationStatus: true,
      },
    },
    organizationMembers: {
      select: {
        memberRole: true,
        permissions: true,
      },
    },
  } as const;

  /**
   * Crea o loguea un usuario vía Google.
   * - App mobile: cuentas nuevas **siempre** paciente (nunca profesional).
   * - Web: `roleIntent=doctor` → profesional pendiente; `patient` → paciente.
   */
  async loginOrRegisterWithGoogle(
    profile: GoogleProfile,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    // La app móvil solo registra pacientes vía Google.
    const roleIntent =
      client === 'mobile' ? 'patient' : profile.roleIntent;

    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: this.authUserInclude,
    });

    if (!existing) {
      const isDoctorIntent = roleIntent === 'doctor';
      const randomPassword = await argon2.hash(randomBytes(32).toString('hex'));

      const user = await this.prisma.user.create({
        data: {
          email: profile.email,
          password: randomPassword,
          googleId: profile.googleId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          firstName: profile.firstName,
          lastName: profile.lastName,
          ...(isDoctorIntent
            ? {
                roles: { connect: [{ name: OAUTH_DOCTOR_DEFAULT_ROLE }] },
                doctor: {
                  create: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    membershipType: 'solo_doctor',
                    empresa: false,
                    empresaReferida: false,
                    verificationStatus: 'pending',
                    specialty: OAUTH_DOCTOR_DEFAULT_SPECIALTY,
                  },
                },
              }
            : {
                roles: { connect: { name: 'patient' } },
                patient: {
                  create: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                  },
                },
              }),
        },
        include: this.authUserInclude,
      });

      const session = this.resolveSessionContext(user);
      return this.buildAuthResult(user, session, client);
    }

    // No convertir a profesional desde la app mobile.
    if (roleIntent === 'doctor' && client !== 'mobile') {
      await this.bootstrapGoogleDoctor(existing.id, profile);
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

    const wantsPatient = roleIntent === 'patient';
    const alreadyPatient = roleNames.includes('patient');
    // Desde mobile (o intent paciente): asegurar perfil patient si aún no hay
    // perfil profesional (no mezclar paneles).
    if (
      wantsPatient &&
      !existing.doctor &&
      (!alreadyPatient || !existing.patient)
    ) {
      if (!alreadyPatient) {
        updateData.roles = { connect: { name: 'patient' } };
      }
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
            include: this.authUserInclude,
          })
        : roleIntent === 'doctor' && client !== 'mobile'
          ? await this.prisma.user.findUniqueOrThrow({
              where: { id: existing.id },
              include: this.authUserInclude,
            })
          : existing;

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client);
  }

  /** Perfil profesional mínimo tras OAuth: rol por defecto y verificación pendiente. */
  private async bootstrapGoogleDoctor(
    userId: bigint,
    profile: GoogleProfile,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctor: true,
        roles: {
          include: { specialty: true, laborTechnicianProfile: true },
        },
      },
    });
    if (!user) return;

    const hasProfessionalRole = user.roles.some(
      (role) => role.specialty || role.laborTechnicianProfile,
    );

    if (!user.doctor) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleId: profile.googleId,
          ...(!hasProfessionalRole
            ? { roles: { connect: [{ name: OAUTH_DOCTOR_DEFAULT_ROLE }] } }
            : {}),
          doctor: {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              membershipType: 'solo_doctor',
              empresa: false,
              empresaReferida: false,
              verificationStatus: 'pending',
              specialty: OAUTH_DOCTOR_DEFAULT_SPECIALTY,
            },
          },
        },
      });
      return;
    }

    if (!user.googleId || !hasProfessionalRole) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(profile.googleId && !user.googleId
            ? { googleId: profile.googleId }
            : {}),
          ...(!hasProfessionalRole
            ? { roles: { connect: [{ name: OAUTH_DOCTOR_DEFAULT_ROLE }] } }
            : {}),
        },
      });
    }

    if (!user.doctor.specialty?.trim()) {
      await this.prisma.doctor.update({
        where: { id: user.doctor.id },
        data: { specialty: OAUTH_DOCTOR_DEFAULT_SPECIALTY },
      });
    }
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
  async sendPhoneOtp(
    dto: SendPhoneOtpDto,
    exceptUserId?: bigint,
  ): Promise<{ ok: true }> {
    const phone = this.normalizePhoneDigits(dto.phone);
    const existing = await this.prisma.user.findFirst({ where: { phone } });
    if (existing && (!exceptUserId || existing.id !== exceptUserId)) {
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

  async sendPhoneOtpForAuthenticatedUser(
    userId: string,
    dto: SendPhoneOtpDto,
  ): Promise<{ ok: true }> {
    return this.sendPhoneOtp(dto, BigInt(userId));
  }

  async assertAndConsumePhoneTicket(
    ticket: string,
    phone: string,
  ): Promise<void> {
    await this.consumePhoneTicket(ticket, phone);
  }

  async confirmPhoneVerification(
    userId: string,
    dto: ConfirmPhoneVerificationDto,
  ): Promise<{ ok: true }> {
    const phone = this.normalizePhoneDigits(dto.phone);
    await this.assertAndConsumePhoneTicket(dto.phoneTicket, phone);

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        phone,
        phoneVerifiedAt: new Date(),
      },
    });

    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (doctor) {
      await this.prisma.doctor.update({
        where: { id: doctor.id },
        data: { phone },
      });
    }

    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (patient) {
      const split =
        phone.startsWith('57') && phone.length >= 12
          ? { prefix: '57', national: phone.slice(2) }
          : phone.length >= 11
            ? { prefix: phone.slice(0, 2), national: phone.slice(2) }
            : { prefix: '57', national: phone };
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: {
          phone: split.national,
          areaCode: `+${split.prefix}`,
        },
      });
    }

    return { ok: true };
  }

  async verifyPhoneOtp(
    dto: VerifyPhoneOtpDto,
  ): Promise<{ ok: true; ticket: string }> {
    const phone = this.normalizePhoneDigits(dto.phone);
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

  private normalizePhoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private phoneOtpKey(phone: string) {
    return `otp:phone:${this.normalizePhoneDigits(phone)}`;
  }

  private phoneTicketKey(ticket: string) {
    return `otp-ticket:phone:${ticket}`;
  }

  private async assertPhoneTicket(ticket: string, phone: string) {
    await this.ensureRedis();
    const key = this.phoneTicketKey(ticket.trim());
    const storedPhone = await this.redis.get(key);
    const normalized = this.normalizePhoneDigits(phone);
    if (!storedPhone || this.normalizePhoneDigits(storedPhone) !== normalized) {
      throw new BadRequestException(
        'Debes verificar tu teléfono con el código enviado por SMS antes de registrarte',
      );
    }
  }

  private async consumePhoneTicket(ticket: string, phone: string) {
    await this.assertPhoneTicket(ticket, phone);
    await this.redis.del(this.phoneTicketKey(ticket.trim()));
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

  /** Permisos RBAC actuales desde BD (no del JWT en caché). */
  async getPermissionsForUser(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: this.authUserInclude,
    });
    if (!user) return [];
    return this.resolvePermissions(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async findUserByEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    return this.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      include: this.authUserInclude,
    });
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }
  }

  private assertMobileLoginAllowed(
    role: Role,
    client: 'mobile' | 'web',
  ): void {
    if (client === 'mobile' && !isMobileLoginAllowed(role)) {
      throw new ForbiddenException(
        'Esta cuenta no puede iniciar sesión en la app móvil. Usa el panel web.',
      );
    }
  }

  /** Prioridad JWT legacy para flags móviles y verificación doctor. */
  private resolveRole(user: AuthUser, primaryPanel: PrimaryPanel): Role {
    const names = user.roles.map((r) => r.name);
    // Plataforma: siempre ganan, aunque el primaryPanel sea clinical por permisos mixtos.
    if (names.includes('superadmin')) return 'superadmin';
    if (names.includes('monitor')) return 'monitor';

    if (primaryPanel === 'patient') return 'patient';
    if (names.includes('empresa') || user.doctor?.empresa) return 'empresa';
    if (primaryPanel === 'admin') {
      if (user.doctor) return 'doctor';
      return 'doctor';
    }
    const match = ROLE_PRIORITY.find((role) => names.includes(role));
    if (match === 'doctor' || match === 'empresa') return match;
    if (user.doctor) return 'doctor';
    return 'doctor';
  }

  private resolveRoleSlugs(user: AuthUser): string[] {
    return user.roles.filter((role) => role.isActive).map((role) => role.name);
  }

  private resolvePrimaryPanel(user: AuthUser, permissions: string[]): PrimaryPanel {
    return resolveUserPrimaryPanel(
      user.roles.map((role) => ({
        name: role.name,
        isActive: role.isActive,
        primaryPanel: role.primaryPanel,
      })),
      permissions,
      { hasPatientProfile: Boolean(user.patient) },
    );
  }

  private resolveTeamContext(user: AuthUser): {
    teamPermissions: TeamMemberPermission[] | null;
    organizationMemberRole: 'owner' | 'member' | null;
    isOrgMember: boolean;
  } {
    const membership = user.organizationMembers?.[0];
    if (!membership) {
      return {
        teamPermissions: null,
        organizationMemberRole: null,
        isOrgMember: false,
      };
    }
    if (membership.memberRole === 'owner') {
      return {
        teamPermissions: [...TEAM_MEMBER_PERMISSIONS],
        organizationMemberRole: 'owner',
        isOrgMember: true,
      };
    }
    const parsed = parseTeamMemberPermissions(membership.permissions);
    return {
      teamPermissions: parsed,
      organizationMemberRole: 'member',
      isOrgMember: true,
    };
  }

  private resolveSessionContext(user: AuthUser): {
    role: Role;
    primaryPanel: PrimaryPanel;
    roleSlugs: string[];
    permissions: string[];
    teamPermissions: TeamMemberPermission[] | null;
    organizationMemberRole: 'owner' | 'member' | null;
    isOrgMember: boolean;
  } {
    const permissions = this.resolvePermissions(user);
    const team = this.resolveTeamContext(user);
    const hasActiveRole = user.roles.some((role) => role.isActive);
    if (
      !hasActiveRole &&
      !user.patient &&
      !user.doctor &&
      permissions.length === 0
    ) {
      throw new UnauthorizedException('El usuario no tiene un rol asignado');
    }
    const primaryPanel = this.resolvePrimaryPanel(user, permissions);
    const role = this.resolveRole(user, primaryPanel);
    return {
      role,
      primaryPanel,
      roleSlugs: this.resolveRoleSlugs(user),
      permissions,
      ...team,
    };
  }

  /** Unión de slugs activos de todos los roles del usuario. */
  private resolvePermissions(user: AuthUser): string[] {
    const slugs = new Set<string>();
    for (const role of user.roles) {
      if (!role.isActive) continue;
      for (const permission of role.permissions) {
        if (!permission.isActive) continue;
        slugs.add(permission.slug);
      }
    }
    return Array.from(slugs);
  }

  private buildAuthResult(
    user: AuthUser,
    session: {
      role: Role;
      primaryPanel: PrimaryPanel;
      roleSlugs: string[];
      permissions: string[];
      teamPermissions: TeamMemberPermission[] | null;
      organizationMemberRole: 'owner' | 'member' | null;
      isOrgMember: boolean;
    },
    client: 'mobile' | 'web' = 'web',
  ): AuthResult {
    this.assertMobileLoginAllowed(session.role, client);
    const empresa = user.doctor?.empresa ?? false;
    const empresaReferida = user.doctor?.empresaReferida ?? false;
    const verificationStatus = user.doctor?.verificationStatus ?? 'pending';
    const doctorFlags =
      session.role === 'doctor' || session.role === 'empresa'
        ? { empresa, empresaReferida, verificationStatus }
        : {};
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: session.role,
      primaryPanel: session.primaryPanel,
      roleSlugs: session.roleSlugs,
      permissions: session.permissions,
      teamPermissions: session.teamPermissions,
      organizationMemberRole: session.organizationMemberRole,
      isOrgMember: session.isOrgMember,
      surveyCompletedAt:
        session.role === 'patient'
          ? (user.patient?.surveyCompletedAt?.toISOString() ?? null)
          : undefined,
      ...doctorFlags,
    };

    // Mobile: 24h (sesión más larga en app). Web: 15m + refresh cookie.
    const accessExpiresIn = client === 'mobile' ? '24h' : '15m';
    const accessToken = this.jwt.sign(payload, { expiresIn: accessExpiresIn });
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
        role: session.role,
        primaryPanel: session.primaryPanel,
        permissions: session.permissions,
        teamPermissions: session.teamPermissions,
        organizationMemberRole: session.organizationMemberRole,
        isOrgMember: session.isOrgMember,
        ...doctorFlags,
      },
    };
  }
}
