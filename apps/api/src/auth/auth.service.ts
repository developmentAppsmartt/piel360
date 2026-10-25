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
  SESSION_REPLACED,
  SESSION_REPLACED_MESSAGE,
  TEAM_MEMBER_PERMISSIONS,
  SEAT_PLAN_LIMITS,
  slugifyAlliedOrgName,
  toPublicProviderPermissions,
  type MembershipType,
  type PrimaryPanel,
  type Role,
  type TeamMemberPermission,
} from '@piel360/shared';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { assertDocumentNumberAvailable } from '../common/document-number.util';
import {
  normalizePhoneDigits,
  splitPhoneDigits,
} from '../common/phone.util';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import type {
  SendChangePasswordOtpDto,
  VerifyChangePasswordOtpDto,
} from './dto/change-password-otp.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDoctorDto } from './dto/register-doctor.dto';
import type { RegisterEmpresaDto } from './dto/register-empresa.dto';
import type { RegisterPatientDto } from './dto/register-patient.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import type { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import type { VerifyCurrentPasswordDto } from './dto/verify-current-password.dto';
import type { GoogleProfile } from './google.strategy';
import { EmailOtpService } from './email-otp.service';
import { issuePasswordResetToken } from './password-reset-token';
import { PhoneOtpService } from './phone-otp.service';
import { RecaptchaService } from './recaptcha.service';
import { sessionSlotFor } from './session-policy';
import type { JwtPayload } from './types';

/** TTL del código de intercambio de Google OAuth: solo debe vivir el tiempo
 * del redirect navegador → API → front (segundos). */
const GOOGLE_EXCHANGE_TTL_SECONDS = 60;

/** Duración del access token (web y móvil) y del refresh token. Si cambian,
 * ajustar también el `maxAge` de las cookies en apps/web/src/lib/session.ts. */
const ACCESS_TOKEN_TTL = '24h';
const REFRESH_TOKEN_TTL = '7d';

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
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly recaptcha: RecaptchaService,
    private readonly emailOtp: EmailOtpService,
    private readonly phoneOtp: PhoneOtpService,
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
    const emailTicket = dto.emailTicket?.trim();
    if (emailTicket) {
      await this.emailOtp.consumeRegisterTicket(emailTicket, email);
    }
    const phone = normalizePhoneDigits(dto.phone);
    if (dto.phoneTicket) {
      await this.phoneOtp.assertTicket(dto.phoneTicket, phone);
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
          // Solo se marca verificado si hubo ticket OTP.
          emailVerifiedAt: emailTicket ? new Date() : null,
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
              professionalKind: dto.professionalKind ?? null,
              medicalRegistry: dto.medicalRegistry?.trim() || null,
              licenseNumber: dto.licenseNumber?.trim() || null,
              educationEntity: dto.educationEntity?.trim() || null,
              graduationInstitution: dto.graduationInstitution?.trim() || null,
              technicalInstitution: dto.technicalInstitution?.trim() || null,
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
      await this.phoneOtp.consumeTicket(dto.phoneTicket, phone);
    }

    if (dto.referralCode?.trim()) {
      await this.attachAlliedReferral(user.id, dto.referralCode.trim());
    }

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client);
  }

  async registerEmpresa(
    dto: RegisterEmpresaDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const phone = normalizePhoneDigits(dto.phone);
    if (!dto.phoneTicket?.trim()) {
      throw new BadRequestException(
        'Debes verificar tu teléfono con el código enviado por SMS antes de registrarte',
      );
    }
    await this.phoneOtp.assertTicket(dto.phoneTicket, phone);
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
    const referralSlug = empresaReferida
      ? `${slugifyAlliedOrgName(dto.organizationName.trim())}-${randomBytes(2).toString('hex')}`
      : null;
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
          referralSlug,
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
          bankName:
            empresaReferida && dto.bankName?.trim()
              ? dto.bankName.trim()
              : null,
          bankId:
            empresaReferida && dto.bankId?.trim()
              ? dto.bankId.trim()
              : null,
          bankAccountType:
            empresaReferida && dto.bankAccountType?.trim()
              ? dto.bankAccountType.trim().toUpperCase()
              : null,
          bankAccountNumber:
            empresaReferida && dto.bankAccountNumber?.trim()
              ? dto.bankAccountNumber.trim()
              : null,
          payoutBeneficiaryName:
            empresaReferida && dto.payoutBeneficiaryName?.trim()
              ? dto.payoutBeneficiaryName.trim()
              : null,
          payoutBeneficiaryEmail:
            empresaReferida && dto.payoutBeneficiaryEmail?.trim()
              ? dto.payoutBeneficiaryEmail.trim().toLowerCase()
              : null,
          payoutLegalIdType:
            empresaReferida && dto.payoutLegalIdType?.trim()
              ? dto.payoutLegalIdType.trim().toUpperCase()
              : null,
          payoutLegalId:
            empresaReferida && dto.payoutLegalId?.trim()
              ? dto.payoutLegalId.trim()
              : null,
          ...(dto.lat != null && dto.lng != null
            ? { lat: dto.lat, lng: dto.lng }
            : {}),
          members: {
            create: {
              userId: newUser.id,
              memberRole: 'owner',
            },
          },
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

    await this.phoneOtp.consumeTicket(dto.phoneTicket, phone);

    if (dto.referralCode?.trim()) {
      await this.attachAlliedReferral(created.id, dto.referralCode.trim());
    }

    const session = this.resolveSessionContext(created);
    return this.buildAuthResult(created, session, client);
  }

  private generateReferralCode(): string {
    return `ALI-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async resolveAlliedReferral(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Código de referido no válido');
    }

    const org = await this.prisma.organization.findFirst({
      where: {
        type: 'empresa_aliada',
        referralCode: { equals: normalized, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        referralSlug: true,
        status: true,
      },
    });

    if (!org?.referralCode) {
      throw new BadRequestException('Código de referido no encontrado');
    }

    let slug = org.referralSlug;
    if (!slug) {
      slug = slugifyAlliedOrgName(org.name);
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { referralSlug: slug },
      });
    }

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ??
      'http://localhost:3001';

    return {
      code: org.referralCode,
      organizationName: org.name,
      slug,
      status: org.status,
      referralUrl: `${frontendUrl}/doctor/register?aliada=${encodeURIComponent(slug)}&ref=${encodeURIComponent(org.referralCode)}`,
    };
  }

  private async attachAlliedReferral(userId: bigint, code: string) {
    const normalized = code.trim().toUpperCase();
    const org = await this.prisma.organization.findFirst({
      where: {
        type: 'empresa_aliada',
        referralCode: { equals: normalized, mode: 'insensitive' },
      },
      select: { id: true, referralCode: true },
    });
    if (!org?.referralCode) {
      throw new BadRequestException(
        'El código de empresa aliada no es válido.',
      );
    }

    const already = await this.prisma.referral.findFirst({
      where: { referredUserId: userId },
      select: { id: true },
    });
    if (already) return;

    await this.prisma.referral.create({
      data: {
        organizationId: org.id,
        code: org.referralCode,
        referredUserId: userId,
      },
    });
  }

  async registerPatient(
    dto: RegisterPatientDto,
    client: 'mobile' | 'web' = 'web',
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const emailTicket = dto.emailTicket?.trim();
    if (emailTicket) {
      await this.emailOtp.consumeRegisterTicket(emailTicket, email);
    }
    const phone = normalizePhoneDigits(dto.phone);
    await this.phoneOtp.assertTicket(dto.phoneTicket, phone);

    await this.assertEmailAvailable(email);
    await assertDocumentNumberAvailable(this.prisma, dto.docNumber);
    const password = await argon2.hash(dto.password);

    const { areaCode, phone: nationalPhone } = splitPhoneDigits(phone);
    const birthDate = dto.birthDate?.trim()
      ? new Date(dto.birthDate.trim())
      : null;
    const docType = dto.docType.trim();
    const docNumber = dto.docNumber.trim();

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
            phone: nationalPhone || null,
            areaCode,
            docType,
            docNumber,
            ...(birthDate && !Number.isNaN(birthDate.getTime())
              ? { birthDate }
              : {}),
            ...(dto.gender?.trim() ? { gender: dto.gender.trim() } : {}),
            ...(dto.address?.trim() ? { address: dto.address.trim() } : {}),
            ...(dto.lat != null ? { lat: dto.lat } : {}),
            ...(dto.lng != null ? { lng: dto.lng } : {}),
            ...(dto.skinType?.trim()
              ? { skinType: dto.skinType.trim() }
              : {}),
            ...(dto.fitzpatrickType?.trim()
              ? { fitzpatrickType: dto.fitzpatrickType.trim() }
              : {}),
            ...(dto.mascotType?.trim()
              ? { mascotType: dto.mascotType.trim() }
              : {}),
          },
        },
      },
      include: { roles: { include: { permissions: true } }, patient: true },
    });

    await this.phoneOtp.consumeTicket(dto.phoneTicket, phone);

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
    devicePlatform?: string,
  ): Promise<AuthResult> {
    // Web y móvil usan la acción "login" (SDK móvil: RecaptchaAction.LOGIN;
    // web: la casilla «No soy un robot»). El web se verifica con la site key
    // web (RECAPTCHA_SITE_KEY); el móvil, con la de su plataforma.
    if (this.recaptcha.appliesTo(client, devicePlatform)) {
      await this.recaptcha.assertValid(dto.captchaToken, {
        required: true,
        action: 'login',
        platform: client === 'mobile' ? devicePlatform : undefined,
      });
    }

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
    let sid: string | undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid?: string }>(
        refreshToken,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      sub = payload.sub;
      sid = payload.sid;
    } catch {
      throw new UnauthorizedException('Sesión expirada, inicia sesión de nuevo');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(sub) },
      include: this.authUserInclude,
    });
    if (!user) throw new UnauthorizedException();

    // Refresh tokens emitidos antes de las sesiones no traen `sid`: se les
    // abre una sesión nueva en vez de rechazarlos, para no desloguear a todo
    // el mundo en el deploy.
    let activeSessionId: string | undefined;
    if (sid) {
      const stored = await this.prisma.userSession.findUnique({
        where: { id: sid },
        select: { userId: true, revokedAt: true, revokedReason: true },
      });
      if (!stored || stored.userId !== user.id || stored.revokedAt) {
        throw new UnauthorizedException({
          code: SESSION_REPLACED,
          message:
            stored?.revokedReason === 'replaced'
              ? SESSION_REPLACED_MESSAGE
              : 'Sesión expirada, inicia sesión de nuevo',
        });
      }
      activeSessionId = sid;
    }

    const session = this.resolveSessionContext(user);
    return this.buildAuthResult(user, session, client, activeSessionId);
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

  /**
   * Cambio de contraseña probando la identidad con la contraseña ACTUAL, que
   * es el camino por defecto cuando hay sesión abierta. El OTP queda como
   * alternativa para quien no la recuerda.
   */
  async verifyCurrentPassword(
    userId: string,
    dto: VerifyCurrentPasswordDto,
  ): Promise<{ ok: true; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user?.email || !user.password) throw new UnauthorizedException();

    if (!(await argon2.verify(user.password, dto.currentPassword))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    return { ok: true, token: await issuePasswordResetToken(this.prisma, user.email) };
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
   * Cambio de contraseña (y opcionalmente celular) para el usuario de la sesión.
   * No usa el flujo público por teléfono: ese hacía findFirst y podía resetear
   * otra cuenta si el número estaba duplicado o no era el del paciente.
   */
  async sendChangePasswordOtp(
    userId: string,
    dto: SendChangePasswordOtpDto,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user?.email) throw new UnauthorizedException();

    if (dto.channel === 'email') {
      return this.emailOtp.send({ email: user.email, purpose: 'reset' });
    }
    return this.phoneOtp.sendForPasswordChange(user, dto.phone);
  }

  async verifyChangePasswordOtp(
    userId: string,
    dto: VerifyChangePasswordOtpDto,
  ): Promise<{ ok: true; token: string; phoneTicket?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user?.email) throw new UnauthorizedException();

    if (dto.channel === 'email') {
      const verified = await this.emailOtp.verify({
        email: user.email,
        purpose: 'reset',
        code: dto.code,
      });
      if (!verified.token) {
        throw new BadRequestException('Código inválido o expirado');
      }
      return { ok: true, token: verified.token };
    }
    return this.phoneOtp.verifyForPasswordChange(
      { id: user.id, email: user.email },
      dto.phone,
      dto.code,
    );
  }

  async assertAndConsumePhoneTicket(
    ticket: string,
    phone: string,
  ): Promise<void> {
    await this.phoneOtp.consumeTicket(ticket, phone);
  }

  async confirmPhoneVerification(
    userId: string,
    dto: ConfirmPhoneVerificationDto,
  ): Promise<{ ok: true }> {
    const phone = normalizePhoneDigits(dto.phone);
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

  /**
   * Último paso del cambio de correo. El código ya viajó al correo NUEVO con
   * `otp/send`/`otp/verify` (`purpose: 'register'`, el único que rechaza un
   * correo ya registrado), así que aquí solo se canjea el ticket.
   *
   * La sesión NO se cierra: el JWT va por `sub`, no por correo.
   */
  async confirmEmailChange(
    userId: string,
    dto: ConfirmEmailChangeDto,
  ): Promise<{ ok: true; email: string }> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user?.email) throw new UnauthorizedException();

    if (user.email === email) {
      throw new BadRequestException('Ese ya es tu correo actual');
    }

    await this.emailOtp.consumeRegisterTicket(dto.emailTicket, email);

    // Entre el código y el canje pudo registrarse otro con ese correo, y la
    // columna es `@unique`: sin esto el update revienta con un P2002 crudo.
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const anterior = user.email;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { email, emailVerifiedAt: new Date() },
    });

    // `doctors` no guarda correo (usa el del user); `patients` sí.
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.id },
    });
    if (patient) {
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: { email },
      });
    }

    // Aviso al correo anterior: deja rastro si alguien secuestró la sesión.
    // HTML fijo igual que el del OTP — son correos de seguridad y no deben
    // quedar en una plantilla que el doctor pueda editar.
    await this.mail.send({
      to: anterior,
      subject: 'Tu correo de acceso cambió — Piel360',
      html:
        `<p>El correo de acceso de tu cuenta Piel360 cambió a ` +
        `<strong>${email}</strong>.</p>` +
        `<p>A partir de ahora tienes que iniciar sesión con ese correo. ` +
        `Las sesiones que ya tenías abiertas siguen funcionando.</p>` +
        `<p><strong>Si no fuiste tú</strong>, escríbenos de inmediato a ` +
        `${this.supportEmail()} para recuperar la cuenta.</p>`,
    });

    return { ok: true, email };
  }

  private supportEmail(): string {
    return (
      this.config.get<string>('SUPPORT_EMAIL') ??
      this.config.get<string>('MAIL_FROM') ??
      'soporte@piel360.com'
    );
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

  /** Permisos para UI/cliente: enmascara slugs de proveedores vendor. */
  async getPublicPermissionsForUser(userId: string): Promise<string[]> {
    return toPublicProviderPermissions(await this.getPermissionsForUser(userId));
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

    const hasDoctorProfile = Boolean(user.doctor);
    const hasPatientProfile = Boolean(user.patient);
    const hasPatientRole = names.includes('patient');
    const hasClinicalCoreRole =
      names.includes('doctor') ||
      names.includes('empresa') ||
      hasDoctorProfile;

    // CRM/paciente sin ficha de doctor: nunca tratarlo como profesional
    // (evita "pendiente de verificación" en mobile cuando faltan roles).
    if (hasPatientProfile && !hasDoctorProfile) return 'patient';

    // Paciente puro: no reclasificar a doctor por primaryPanel clínico corrupto/mixto.
    if (hasPatientRole && !hasClinicalCoreRole) return 'patient';
    if (primaryPanel === 'patient') return 'patient';
    if (names.includes('empresa') || user.doctor?.empresa) return 'empresa';
    if (primaryPanel === 'admin') return 'doctor';

    const match = ROLE_PRIORITY.find((role) => names.includes(role));
    if (match === 'doctor' || match === 'empresa' || match === 'patient') {
      return match;
    }
    if (hasDoctorProfile) return 'doctor';
    if (hasPatientProfile || hasPatientRole) return 'patient';
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

  /** Abre una sesión y cierra la que ocupaba el mismo cupo — gana el login
   * más nuevo (ver session-policy.ts para los cupos por rol). */
  private async openSession(
    userId: bigint,
    role: Role,
    client: 'mobile' | 'web',
  ): Promise<string> {
    const slot = sessionSlotFor(role, client);
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
        where: { userId, slot, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'replaced' },
      });
      return tx.userSession.create({ data: { userId, slot, client } });
    });
    return session.id;
  }

  /** Refresh: la sesión sigue siendo la misma, solo se marca el uso. */
  private async touchSession(sessionId: string): Promise<string> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
    return sessionId;
  }

  /** Cierra la sesión del token actual (logout explícito). */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  private async buildAuthResult(
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
    /** Solo en refresh: mantiene viva la sesión existente en vez de abrir
     * una nueva (que expulsaría a la del mismo cupo). */
    existingSessionId?: string,
  ): Promise<AuthResult> {
    this.assertMobileLoginAllowed(session.role, client);
    const sid = existingSessionId
      ? await this.touchSession(existingSessionId)
      : await this.openSession(user.id, session.role, client);
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
      sid,
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

    // 24h en ambas plataformas: antes web duraba 15m y cualquier navegación
    // tras ese rato caía al login (el proxy no refresca por su cuenta).
    const accessToken = this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = this.jwt.sign(
      { sub: payload.sub, sid },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
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
