import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnalysisImageUrlsService } from '../analyses/analysis-image-urls.service';
import type { JwtPayload } from '../auth/types';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { SurveyDto } from './dto/survey.dto';
import {
  isDoctorPanelRole,
  isPlatformAdmin,
  requireOwnPatient,
} from './patient-access';
import {
  PATIENT_RELATIONS,
  PATIENT_USER_SELECT,
  serializePatient,
} from './patient-serializer';

/**
 * Lectura de pacientes y control de acceso. El alta y la edición viven en
 * `PatientWriteService`; las solicitudes de análisis en
 * `PatientAnalysisRequestsService`. Ambos pasan por `findOne` para el acceso.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly imageUrls: AnalysisImageUrlsService,
    private readonly storage: StorageService,
  ) {}

  /** Perfil del paciente autenticado (por userId). No depende del role del JWT. */
  async findMe(userId: string) {
    const own = await requireOwnPatient(this.prisma, userId);
    const mine = await this.ownWithAvatar(own.id);
    if (!mine) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    return mine;
  }

  /** Scoping (MIGRACION.md §2.5/§2.6): doctor/empresa solo ve los suyos,
   * owner empresa ve pacientes de todo el equipo, miembros solo los propios,
   * patient solo se ve a sí mismo, superadmin ve todos. */
  async findAll(
    currentUser: JwtPayload,
    options?: { professionalUserId?: string },
  ) {
    if (isPlatformAdmin(currentUser)) {
      const rows = await this.prisma.patient.findMany({
        include: PATIENT_RELATIONS,
        orderBy: { id: 'asc' },
      });
      return Promise.all(
        rows.map((row) => serializePatient(this.storage, row, true)),
      );
    }

    if (isDoctorPanelRole(currentUser.role)) {
      // JWT puede decir doctor/empresa sin fila en `doctors` (sesión mal clasificada).
      // En ese caso, si tiene perfil paciente, devolver solo el propio.
      const doctorRow = await this.prisma.doctor.findUnique({
        where: { userId: BigInt(currentUser.sub) },
        select: { id: true },
      });
      if (!doctorRow) {
        const own = await requireOwnPatient(this.prisma, currentUser.sub);
        const mine = await this.ownWithAvatar(own.id);
        return mine ? [mine] : [];
      }

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
          throw new BadRequestException(
            'Profesional no encontrado en tu equipo',
          );
        }
        doctorIds = [BigInt(professional.doctorId)];
      }

      const rows = await this.prisma.patient.findMany({
        where: { doctorId: { in: doctorIds } },
        include: PATIENT_RELATIONS,
        orderBy: { id: 'asc' },
      });
      return Promise.all(
        rows.map((row) =>
          serializePatient(this.storage, row, scope.ctx.isOrgOwner),
        ),
      );
    }

    const own = await requireOwnPatient(this.prisma, currentUser.sub);
    const mine = await this.ownWithAvatar(own.id);
    return mine ? [mine] : [];
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(id) },
      include: PATIENT_RELATIONS,
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // Superadmin/monitor no tienen perfil doctor; no pasar por scope de equipo.
    if (isPlatformAdmin(currentUser)) {
      return serializePatient(this.storage, patient, true);
    }

    if (isDoctorPanelRole(currentUser.role)) {
      const doctorRow = await this.prisma.doctor.findUnique({
        where: { userId: BigInt(currentUser.sub) },
        select: { id: true },
      });
      // JWT doctor sin fila doctor + es el dueño del paciente → acceso propio.
      if (!doctorRow) {
        if (patient.userId?.toString() === currentUser.sub) {
          return serializePatient(this.storage, patient);
        }
        throw new ForbiddenException('El usuario no tiene un perfil de doctor');
      }
      await this.orgContext.assertTeamPermissionForUser(
        currentUser.sub,
        'patients',
      );
      await this.assertCanAccess(patient, currentUser);
      const scope = await this.orgContext.resolvePatientDoctorScope(
        currentUser.sub,
      );
      return serializePatient(this.storage, patient, scope.ctx.isOrgOwner);
    }

    await this.assertCanAccess(patient, currentUser);
    // Paciente (u otro rol sin perfil doctor): no exigir OrgContext de doctor.
    return serializePatient(this.storage, patient);
  }

  /** `GET /api/me/survey` — el propio paciente. */
  async getMySurvey(userId: string) {
    const patient = await requireOwnPatient(this.prisma, userId);
    return {
      surveyCompletedAt: patient.surveyCompletedAt,
      surveyResponses: patient.surveyResponses,
      skinType: patient.skinType,
      fitzpatrickType: patient.fitzpatrickType,
    };
  }

  /** `POST /api/me/survey` — encuesta obligatoria (MIGRACION.md §2.6). */
  async submitMySurvey(userId: string, dto: SurveyDto) {
    const patient = await requireOwnPatient(this.prisma, userId);
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
          analisisPiel360TaskId: true,
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
    // por analisisPiel360TaskId como respaldo.
    return this.prisma.analysis.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { provider: { select: { displayLabel: true } } },
    });
  }

  private async ownWithAvatar(patientId: bigint) {
    const withUser = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: PATIENT_USER_SELECT },
    });
    return withUser ? serializePatient(this.storage, withUser) : null;
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
