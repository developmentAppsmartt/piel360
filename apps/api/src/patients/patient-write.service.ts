import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { isStrongPassword, PASSWORD_STRENGTH_MESSAGE } from '@piel360/shared';
import { AuthService } from '../auth/auth.service';
import type { JwtPayload } from '../auth/types';
import { assertDocumentNumberAvailable } from '../common/document-number.util';
import { combinePhoneDigits } from '../common/phone.util';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreatePatientDto } from './dto/create-patient.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';
import { isDoctorPanelRole, isPlatformAdmin } from './patient-access';
import { PatientInviteService } from './patient-invite.service';
import { resolvePatientEmailChange } from './patient-login-email';
import { PATIENT_RELATIONS, serializePatient } from './patient-serializer';
import { PatientsService } from './patients.service';

/** Alta, edición y asignación de profesional de un paciente. */
@Injectable()
export class PatientWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
    private readonly authService: AuthService,
    private readonly patientInvite: PatientInviteService,
  ) {}

  async create(dto: CreatePatientDto, currentUser: JwtPayload) {
    let doctorId: bigint | undefined;
    // El catálogo de plantillas es de la empresa, no del miembro: con el
    // doctorId del miembro se perdía el texto que configuró el dueño.
    let catalogDoctorId: bigint | null = null;
    if (isDoctorPanelRole(currentUser.role)) {
      const scope = await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'patients',
      );
      doctorId = scope.doctorId;
      catalogDoctorId = scope.catalogDoctorId;
    } else if (currentUser.role !== 'superadmin') {
      throw new ForbiddenException(
        'Solo doctores o administradores pueden crear pacientes',
      );
    }

    const { birthDate, password, email, createAppAccess, ...rest } = dto;
    const emailNorm = email?.trim().toLowerCase() || undefined;
    // Acceso app: checkbox explícito (web) O email+password (mobile legacy /
    // formularios que siempre piden clave al crear paciente).
    const wantsLogin =
      createAppAccess === true ||
      Boolean(emailNorm && password && isStrongPassword(password));

    await assertDocumentNumberAvailable(this.prisma, dto.docNumber);

    if (wantsLogin) {
      if (!emailNorm) {
        throw new BadRequestException(
          'El correo es obligatorio para crear acceso del paciente',
        );
      }
      if (!password || !isStrongPassword(password)) {
        throw new BadRequestException(PASSWORD_STRENGTH_MESSAGE);
      }

      const existing = await this.prisma.user.findUnique({
        where: { email: emailNorm },
      });
      if (existing) {
        throw new ConflictException('Ya existe una cuenta con ese email');
      }

      const patientRole = await this.prisma.role.findUnique({
        where: { name: 'patient' },
        select: { id: true },
      });
      if (!patientRole) {
        throw new BadRequestException(
          'El rol de paciente no está configurado en el sistema. Contacta al administrador.',
        );
      }

      const hashed = await argon2.hash(password);
      try {
        const user = await this.prisma.user.create({
          data: {
            email: emailNorm,
            password: hashed,
            name: `${dto.firstName} ${dto.lastName}`.trim(),
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
            roles: { connect: { id: patientRole.id } },
            patient: {
              create: {
                ...rest,
                email: emailNorm,
                doctorId,
                ...(birthDate !== undefined
                  ? { birthDate: birthDate ? new Date(birthDate) : null }
                  : {}),
              },
            },
          },
          include: { patient: true, roles: true },
        });

        // Defensa: nunca devolver un user de paciente sin rol patient.
        const hasPatientRole = user.roles.some((r) => r.name === 'patient');
        if (!hasPatientRole) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { roles: { connect: { id: patientRole.id } } },
          });
        }

        return this.withWelcomeEmail(user.patient!, {
          doctorId,
          catalogDoctorId,
          temporaryPassword: password,
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          throw new BadRequestException(
            'No se pudo asignar el rol de paciente. Contacta al administrador.',
          );
        }
        throw err;
      }
    }

    const patient = await this.prisma.patient.create({
      data: {
        ...rest,
        email: emailNorm ?? null,
        doctorId,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
    });
    return this.withWelcomeEmail(patient, { doctorId, catalogDoctorId });
  }

  /** El correo de bienvenida del alta. Si no sale, el alta se mantiene y el
   * panel lo avisa: el paciente ya existe. */
  private async withWelcomeEmail<
    T extends { email: string | null; firstName: string; lastName: string },
  >(
    patient: T,
    ctx: {
      doctorId?: bigint;
      catalogDoctorId: bigint | null;
      temporaryPassword?: string;
    },
  ): Promise<T & { welcomeEmailSent: boolean }> {
    if (!patient.email) {
      return { ...patient, welcomeEmailSent: false };
    }

    const doctor = ctx.doctorId
      ? await this.prisma.doctor.findUnique({
          where: { id: ctx.doctorId },
          select: { user: { select: { name: true } } },
        })
      : null;

    const welcomeEmailSent = await this.patientInvite.sendOnCreate({
      catalogDoctorId: ctx.catalogDoctorId,
      to: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      clinicName: doctor?.user.name?.trim() || 'Piel360',
      temporaryPassword: ctx.temporaryPassword,
    });
    return { ...patient, welcomeEmailSent };
  }

  async update(id: string, dto: UpdatePatientDto, currentUser: JwtPayload) {
    const patient = await this.patients.findOne(id, currentUser);
    const {
      birthDate,
      phone,
      areaCode,
      phoneTicket,
      doctor_id,
      email,
      ...rest
    } = dto;
    const { patientEmail, loginEmail } = await resolvePatientEmailChange(
      this.prisma,
      patient,
      email,
    );
    if (dto.docNumber !== undefined) {
      await assertDocumentNumberAvailable(this.prisma, dto.docNumber, {
        patientId: patient.id,
      });
    }

    let nextDoctorId: bigint | null | undefined;
    if (doctor_id !== undefined) {
      if (!isPlatformAdmin(currentUser)) {
        throw new ForbiddenException(
          'Solo un administrador puede asignar el profesional',
        );
      }
      nextDoctorId = await this.resolveDoctorId(doctor_id);
    }

    const nextArea = areaCode !== undefined ? areaCode : patient.areaCode;
    const nextNational = phone !== undefined ? phone : patient.phone;
    const normalized = combinePhoneDigits(nextArea, nextNational);
    const currentNormalized = combinePhoneDigits(
      patient.areaCode,
      patient.phone,
    );
    const phoneChanged =
      Boolean(normalized) && normalized !== currentNormalized;
    const isOwnPatient = patient.userId?.toString() === currentUser.sub;

    let phoneVerifiedAt: Date | undefined;
    const phoneFieldsTouched = phone !== undefined || areaCode !== undefined;

    // Solo el propio paciente debe verificar por OTP al cambiar celular.
    // El profesional puede actualizar el teléfono del paciente sin SMS.
    // Si el número ya está verificado en User (p. ej. recién registrado),
    // no exigir un ticket OTP nuevo.
    if (isOwnPatient && normalized) {
      const linkedUser = patient.userId
        ? await this.prisma.user.findUnique({
            where: { id: patient.userId },
            select: { phone: true, phoneVerifiedAt: true },
          })
        : null;
      const alreadyVerifiedSamePhone =
        Boolean(linkedUser?.phoneVerifiedAt) &&
        combinePhoneDigits(null, linkedUser?.phone) === normalized;

      if (phoneChanged && !alreadyVerifiedSamePhone) {
        if (!phoneTicket?.trim()) {
          throw new BadRequestException(
            'Debes verificar el nuevo celular con el código enviado por SMS.',
          );
        }
        await this.authService.assertAndConsumePhoneTicket(
          phoneTicket,
          normalized,
        );
        phoneVerifiedAt = new Date();
      } else if (phoneTicket?.trim()) {
        await this.authService.assertAndConsumePhoneTicket(
          phoneTicket,
          normalized,
        );
        phoneVerifiedAt = new Date();
      } else if (alreadyVerifiedSamePhone && phoneChanged) {
        phoneVerifiedAt = linkedUser?.phoneVerifiedAt ?? new Date();
      }
    }

    const syncPhone = phoneVerifiedAt || (phoneFieldsTouched && normalized);
    const userData = {
      ...(syncPhone && normalized ? { phone: normalized } : {}),
      ...(phoneVerifiedAt ? { phoneVerifiedAt } : {}),
      ...(loginEmail ? { email: loginEmail } : {}),
    };

    // Ficha y cuenta en la misma transacción: si una falla, no quedan
    // desfasadas (el correo de la ficha distinto del de inicio de sesión).
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.patient.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(patientEmail !== undefined ? { email: patientEmail } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(areaCode !== undefined ? { areaCode } : {}),
          ...(birthDate !== undefined
            ? { birthDate: birthDate ? new Date(birthDate) : null }
            : {}),
          ...(nextDoctorId !== undefined ? { doctorId: nextDoctorId } : {}),
        },
        include: PATIENT_RELATIONS,
      });
      if (patient.userId && Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: patient.userId }, data: userData });
      }
      return saved;
    });

    return serializePatient(
      this.storage,
      updated,
      isPlatformAdmin(currentUser),
    );
  }

  /**
   * Superadmin/monitor: asigna o desasigna el profesional del paciente.
   * `doctor_id` null/vacío deja al paciente sin médico.
   */
  async assignDoctor(
    id: string,
    doctorId: string | null | undefined,
    currentUser: JwtPayload,
  ) {
    if (!isPlatformAdmin(currentUser)) {
      throw new ForbiddenException(
        'Solo un administrador puede asignar el profesional',
      );
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(id) },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: { doctorId: await this.resolveDoctorId(doctorId) },
      include: PATIENT_RELATIONS,
    });
    return serializePatient(this.storage, updated, true);
  }

  /** `doctor_id` del panel → id del profesional, o null para desasignar. */
  private async resolveDoctorId(
    raw: string | null | undefined,
  ): Promise<bigint | null> {
    const value = raw?.trim() || null;
    if (!value) return null;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: BigInt(value) },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException('Profesional no encontrado');
    return doctor.id;
  }
}
