import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import { AnalysisImageUrlsService } from '../analyses/analysis-image-urls.service';
import type { JwtPayload } from '../auth/types';
import { assertDocumentNumberAvailable } from '../common/document-number.util';
import { combinePhoneDigits } from '../common/phone.util';
import { AuthService } from '../auth/auth.service';
import { DoctorsService } from '../doctors/doctors.service';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreatePatientDto } from './dto/create-patient.dto';
import type { CreateAnalysisRequestDto } from './dto/create-analysis-request.dto';
import type { SurveyDto } from './dto/survey.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';

function isDoctorPanelRole(role: Role): boolean {
  return (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
}

/** Admin de plataforma: listado global de pacientes (panel /admin/pacientes). */
function isPlatformAdmin(user: JwtPayload): boolean {
  if (user.role === 'superadmin' || user.role === 'monitor') return true;
  if (
    user.roleSlugs?.includes('superadmin') ||
    user.roleSlugs?.includes('monitor')
  ) {
    return true;
  }
  if (user.primaryPanel === 'admin') return true;
  return user.permissions?.includes('admin.patients') === true;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
    private readonly orgContext: OrgContextService,
    private readonly imageUrls: AnalysisImageUrlsService,
    private readonly storage: StorageService,
    private readonly authService: AuthService,
  ) {}

  /** Scoping (MIGRACION.md §2.5/§2.6): doctor/empresa solo ve los suyos,
   * owner empresa ve pacientes de todo el equipo, miembros solo los propios,
   * patient solo se ve a sí mismo, superadmin ve todos. */
  async findAll(
    currentUser: JwtPayload,
    options?: { professionalUserId?: string },
  ) {
    if (isPlatformAdmin(currentUser)) {
      const rows = await this.prisma.patient.findMany({
        include: { user: { select: { avatarKey: true } } },
        orderBy: { id: 'asc' },
      });
      return Promise.all(rows.map((row) => this.withAvatarUrl(row)));
    }

    if (isDoctorPanelRole(currentUser.role)) {
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      this.orgContext.assertTeamPermission(scope.ctx, 'patients');

      let doctorIds = scope.visibleDoctorIds;
      if (options?.professionalUserId) {
        if (!scope.ctx.isOrgOwner) {
          throw new ForbiddenException(
            'Solo el dueño del equipo puede filtrar por profesional',
          );
        }
        const professional = scope.professionals.find(
          (p) => p.userId === options.professionalUserId,
        );
        if (!professional) {
          throw new BadRequestException('Profesional no encontrado en tu equipo');
        }
        doctorIds = [BigInt(professional.doctorId)];
      }

      const rows = await this.prisma.patient.findMany({
        where: { doctorId: { in: doctorIds } },
        include: {
          user: { select: { avatarKey: true } },
          doctor: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      });
      return Promise.all(
        rows.map((row) => this.withAvatarUrl(row, scope.ctx.isOrgOwner)),
      );
    }

    const own = await this.requireOwnPatient(currentUser.sub);
    const withUser = await this.prisma.patient.findUnique({
      where: { id: own.id },
      include: { user: { select: { avatarKey: true } } },
    });
    return withUser ? [await this.withAvatarUrl(withUser)] : [];
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: { select: { avatarKey: true } },
        doctor: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // Superadmin/monitor no tienen perfil doctor; no pasar por scope de equipo.
    if (isPlatformAdmin(currentUser)) {
      return this.withAvatarUrl(patient, true);
    }

    if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'patients',
      );
      await this.assertCanAccess(patient, currentUser);
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      return this.withAvatarUrl(patient, scope.ctx.isOrgOwner);
    }

    await this.assertCanAccess(patient, currentUser);
    // Paciente (u otro rol sin perfil doctor): no exigir OrgContext de doctor.
    return this.withAvatarUrl(patient);
  }

  async create(dto: CreatePatientDto, currentUser: JwtPayload) {
    let doctorId: bigint | undefined;
    if (isDoctorPanelRole(currentUser.role)) {
      const scope = await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'patients',
      );
      doctorId = scope.doctorId;
    } else if (currentUser.role !== 'superadmin') {
      throw new ForbiddenException(
        'Solo doctores o administradores pueden crear pacientes',
      );
    }

    const { birthDate, password, email, ...rest } = dto;
    const emailNorm = email?.trim().toLowerCase() || undefined;
    const wantsLogin = !!(emailNorm || password);

    await assertDocumentNumberAvailable(this.prisma, dto.docNumber);

    if (wantsLogin) {
      if (!emailNorm) {
        throw new BadRequestException(
          'El correo es obligatorio para crear acceso del paciente',
        );
      }
      if (!password || password.length < 8) {
        throw new BadRequestException(
          'La contraseña es obligatoria (mínimo 8 caracteres) para crear acceso',
        );
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
          include: { patient: true },
        });

        return user.patient!;
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

    return this.prisma.patient.create({
      data: {
        ...rest,
        email: emailNorm ?? null,
        doctorId,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
    });
  }

  async update(id: string, dto: UpdatePatientDto, currentUser: JwtPayload) {
    const patient = await this.findOne(id, currentUser);
    const { birthDate, phone, areaCode, phoneTicket, ...rest } = dto;
    if (dto.docNumber !== undefined) {
      await assertDocumentNumberAvailable(this.prisma, dto.docNumber, {
        patientId: patient.id,
      });
    }

    const nextArea = areaCode !== undefined ? areaCode : patient.areaCode;
    const nextNational = phone !== undefined ? phone : patient.phone;
    const normalized = combinePhoneDigits(nextArea, nextNational);
    const currentNormalized = combinePhoneDigits(
      patient.areaCode,
      patient.phone,
    );
    const phoneChanged = Boolean(normalized) && normalized !== currentNormalized;
    const isOwnPatient = patient.userId?.toString() === currentUser.sub;

    let phoneVerifiedAt: Date | undefined;
    const phoneFieldsTouched = phone !== undefined || areaCode !== undefined;

    // Solo el propio paciente debe verificar por OTP al cambiar celular.
    // El profesional puede actualizar el teléfono del paciente sin SMS.
    if (isOwnPatient && normalized) {
      if (phoneChanged) {
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
      }
    }

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...rest,
        ...(phone !== undefined ? { phone } : {}),
        ...(areaCode !== undefined ? { areaCode } : {}),
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
      include: { user: { select: { avatarKey: true } } },
    });

    if (
      patient.userId &&
      (phoneVerifiedAt || (phoneFieldsTouched && normalized))
    ) {
      await this.prisma.user.update({
        where: { id: patient.userId },
        data: {
          ...(normalized ? { phone: normalized } : {}),
          ...(phoneVerifiedAt ? { phoneVerifiedAt } : {}),
        },
      });
    }

    return this.withAvatarUrl(updated);
  }

  /** `GET /api/me/survey` — el propio paciente. */
  async getMySurvey(userId: string) {
    const patient = await this.requireOwnPatient(userId);
    return {
      surveyCompletedAt: patient.surveyCompletedAt,
      surveyResponses: patient.surveyResponses,
      skinType: patient.skinType,
      fitzpatrickType: patient.fitzpatrickType,
    };
  }

  /** `POST /api/me/survey` — encuesta obligatoria (MIGRACION.md §2.6). */
  async submitMySurvey(userId: string, dto: SurveyDto) {
    const patient = await this.requireOwnPatient(userId);
    return this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        skinType: dto.skinType,
        fitzpatrickType: dto.fitzpatrickType,
        surveyResponses: dto.surveyResponses as Prisma.InputJsonValue,
        surveyCompletedAt: new Date(),
      },
    });
  }

  /** `GET /api/patients/:id/analyses?withCoords=true` — historial 3D
   * (MIGRACION.md §2.5): coords x/y/z de cada análisis sobre el modelo corporal.
   * Paciente solo ve los compartidos; doctor/admin ven todos. */
  async findAnalyses(id: string, currentUser: JwtPayload, withCoords: boolean) {
    const patient = await this.findOne(id, currentUser);
    const where = {
      patientId: patient.id,
      ...(currentUser.role === 'patient' ? { sharedWithPatient: true } : {}),
    };

    if (withCoords) {
      const rows = await this.prisma.analysis.findMany({
        where: {
          ...where,
          xCoord: { not: null },
          yCoord: { not: null },
          zCoord: { not: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          bodyRegion: true,
          xCoord: true,
          yCoord: true,
          zCoord: true,
          aiDiagnosis: true,
          aiProbability: true,
          finalDiagnosis: true,
          aiRawResponse: true,
          imagePath: true,
          coloredS3Url: true,
          maskedS3Url: true,
          youcamTaskId: true,
          createdAt: true,
        },
      });
      // imagePath/coloredS3Url/maskedS3Url son keys del bucket, no URLs
      // navegables — hay que firmarlas igual que AnalysesService#findOne
      // (ver AnalysisImageUrlsService).
      return Promise.all(rows.map((row) => this.imageUrls.withImageUrls(row)));
    }

    // `provider.displayLabel` — filas creadas antes de este campo (o sin
    // providerId poblado) no traen relación; el frontend cae al heurístico
    // por youcamTaskId como respaldo.
    return this.prisma.analysis.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { provider: { select: { displayLabel: true } } },
    });
  }

  private serializeAnalysisRequest(row: {
    id: bigint;
    patientId: bigint;
    doctorId: bigint;
    providerSlug: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id.toString(),
      patientId: row.patientId.toString(),
      doctorId: row.doctorId.toString(),
      providerSlug: row.providerSlug,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Doctor solicita al paciente que realice un análisis en su dispositivo. */
  async createAnalysisRequest(
    patientId: string,
    dto: CreateAnalysisRequestDto,
    currentUser: JwtPayload,
  ) {
    if (!isDoctorPanelRole(currentUser.role) && currentUser.role !== 'superadmin') {
      throw new ForbiddenException('Solo el médico puede solicitar un análisis');
    }
    const patient = await this.findOne(patientId, currentUser);
    if (!patient.userId) {
      throw new BadRequestException(
        'Este paciente no tiene cuenta de acceso; no puede recibir la solicitud en la app',
      );
    }

    const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);

    const existing = await this.prisma.analysisRequest.findFirst({
      where: {
        patientId: patient.id,
        status: 'pending',
        providerSlug: dto.providerSlug,
      },
      orderBy: { id: 'desc' },
    });
    if (existing) {
      return this.serializeAnalysisRequest(existing);
    }

    const row = await this.prisma.analysisRequest.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        providerSlug: dto.providerSlug,
        status: 'pending',
      },
    });
    return this.serializeAnalysisRequest(row);
  }

  /** Paciente: solicitudes pendientes (desbloquean Nuevo Análisis). */
  async getMyPendingAnalysisRequests(userId: string) {
    const patient = await this.requireOwnPatient(userId);
    const rows = await this.prisma.analysisRequest.findMany({
      where: { patientId: patient.id, status: 'pending' },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.serializeAnalysisRequest(row));
  }

  /** Doctor: solicitudes pendientes de un paciente. */
  async listPendingAnalysisRequests(
    patientId: string,
    currentUser: JwtPayload,
  ) {
    if (!isDoctorPanelRole(currentUser.role) && currentUser.role !== 'superadmin') {
      throw new ForbiddenException('Solo el médico puede ver estas solicitudes');
    }
    const patient = await this.findOne(patientId, currentUser);
    const rows = await this.prisma.analysisRequest.findMany({
      where: { patientId: patient.id, status: 'pending' },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.serializeAnalysisRequest(row));
  }

  /** Doctor elimina una solicitud pendiente. */
  async cancelAnalysisRequest(
    patientId: string,
    requestId: string,
    currentUser: JwtPayload,
  ) {
    if (!isDoctorPanelRole(currentUser.role) && currentUser.role !== 'superadmin') {
      throw new ForbiddenException('Solo el médico puede cancelar una solicitud');
    }
    const patient = await this.findOne(patientId, currentUser);
    const row = await this.prisma.analysisRequest.findFirst({
      where: {
        id: BigInt(requestId),
        patientId: patient.id,
        status: 'pending',
      },
    });
    if (!row) {
      throw new NotFoundException('Solicitud no encontrada o ya no está pendiente');
    }
    const deleted = await this.prisma.analysisRequest.delete({
      where: { id: row.id },
    });
    return this.serializeAnalysisRequest(deleted);
  }

  /** Paciente marca la solicitud como completada tras crear el análisis. */
  async completeMyAnalysisRequest(requestId: string, userId: string) {
    const patient = await this.requireOwnPatient(userId);
    const row = await this.prisma.analysisRequest.findFirst({
      where: {
        id: BigInt(requestId),
        patientId: patient.id,
        status: 'pending',
      },
    });
    if (!row) {
      throw new NotFoundException('Solicitud no encontrada o ya no está pendiente');
    }
    const updated = await this.prisma.analysisRequest.update({
      where: { id: row.id },
      data: { status: 'completed' },
    });
    return this.serializeAnalysisRequest(updated);
  }

  private async withAvatarUrl<
    T extends {
      user?: { avatarKey: string | null } | null;
      doctor?: {
        user?: { id: bigint; name: string } | null;
      } | null;
    },
  >(row: T, includeProfessional = false) {
    const { user, doctor, ...patient } = row;
    let avatarUrl: string | null = null;
    if (user?.avatarKey) {
      try {
        avatarUrl = await this.storage.getSignedUrl(user.avatarKey);
      } catch {
        avatarUrl = null;
      }
    }
    const professional =
      includeProfessional && doctor?.user
        ? {
            professionalUserId: doctor.user.id.toString(),
            professionalName: doctor.user.name,
          }
        : {};
    return { ...patient, avatarUrl, ...professional };
  }

  private async requireOwnPatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!patient) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    return patient;
  }

  private async assertCanAccess(
    patient: { doctorId: bigint | null; userId: bigint | null },
    currentUser: JwtPayload,
  ) {
    if (isPlatformAdmin(currentUser)) return;

    if (isDoctorPanelRole(currentUser.role)) {
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'patients',
      );
      const allowed = await this.orgContext.canAccessPatientDoctorId(
        currentUser.sub,
        patient.doctorId,
      );
      if (allowed) return;
      throw new ForbiddenException('Este paciente no pertenece a tu consulta');
    }

    if (patient.userId?.toString() === currentUser.sub) return;
    throw new ForbiddenException('No puedes acceder a este paciente');
  }
}
