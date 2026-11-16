import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/types';
import { DoctorsService } from '../doctors/doctors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAnalysisRequestDto } from './dto/create-analysis-request.dto';
import { isDoctorPanelRole, requireOwnPatient } from './patient-access';
import { PatientsService } from './patients.service';

function serializeAnalysisRequest(row: {
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

function assertDoctorOrSuperadmin(currentUser: JwtPayload, message: string) {
  if (
    !isDoctorPanelRole(currentUser.role) &&
    currentUser.role !== 'superadmin'
  ) {
    throw new ForbiddenException(message);
  }
}

/** Solicitudes del médico al paciente para que haga un análisis en la app. */
@Injectable()
export class PatientAnalysisRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Doctor solicita al paciente que realice un análisis en su dispositivo. */
  async create(
    patientId: string,
    dto: CreateAnalysisRequestDto,
    currentUser: JwtPayload,
  ) {
    assertDoctorOrSuperadmin(
      currentUser,
      'Solo el médico puede solicitar un análisis',
    );
    const patient = await this.patients.findOne(patientId, currentUser);
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
      return serializeAnalysisRequest(existing);
    }

    const row = await this.prisma.analysisRequest.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        providerSlug: dto.providerSlug,
        status: 'pending',
      },
    });

    const professionalName = [doctor.firstName, doctor.lastName]
      .map((x) => x?.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/^dr\.?\s+/i, '')
      .trim();

    void this.notifications
      .create({
        userId: patient.userId,
        type: 'analysis_request',
        title: 'Nueva solicitud de análisis',
        body: professionalName
          ? `${professionalName} ha solicitado un análisis de piel.`
          : 'Tienes una solicitud pendiente de análisis de piel.',
        data: {
          analysisRequestId: row.id.toString(),
          providerSlug: dto.providerSlug,
          patientId: patient.id.toString(),
          professionalName: professionalName || null,
        },
      })
      .catch(() => undefined);

    return serializeAnalysisRequest(row);
  }

  /** Paciente: solicitudes pendientes (desbloquean Nuevo Análisis). */
  async findMyPending(userId: string) {
    const patient = await requireOwnPatient(this.prisma, userId);
    return this.pendingOf(patient.id);
  }

  /** Doctor: solicitudes pendientes de un paciente. */
  async findPending(patientId: string, currentUser: JwtPayload) {
    assertDoctorOrSuperadmin(
      currentUser,
      'Solo el médico puede ver estas solicitudes',
    );
    const patient = await this.patients.findOne(patientId, currentUser);
    return this.pendingOf(patient.id);
  }

  /** Doctor elimina una solicitud pendiente. */
  async cancel(patientId: string, requestId: string, currentUser: JwtPayload) {
    assertDoctorOrSuperadmin(
      currentUser,
      'Solo el médico puede cancelar una solicitud',
    );
    const patient = await this.patients.findOne(patientId, currentUser);
    const row = await this.findPendingRow(patient.id, requestId);
    const deleted = await this.prisma.analysisRequest.delete({
      where: { id: row.id },
    });
    return serializeAnalysisRequest(deleted);
  }

  /** Paciente marca la solicitud como completada tras crear el análisis. */
  async completeMine(requestId: string, userId: string) {
    const patient = await requireOwnPatient(this.prisma, userId);
    const row = await this.findPendingRow(patient.id, requestId);
    const updated = await this.prisma.analysisRequest.update({
      where: { id: row.id },
      data: { status: 'completed' },
    });
    return serializeAnalysisRequest(updated);
  }

  private async pendingOf(patientId: bigint) {
    const rows = await this.prisma.analysisRequest.findMany({
      where: { patientId, status: 'pending' },
      orderBy: { id: 'asc' },
    });
    return rows.map(serializeAnalysisRequest);
  }

  private async findPendingRow(patientId: bigint, requestId: string) {
    const row = await this.prisma.analysisRequest.findFirst({
      where: { id: BigInt(requestId), patientId, status: 'pending' },
    });
    if (!row) {
      throw new NotFoundException(
        'Solicitud no encontrada o ya no está pendiente',
      );
    }
    return row;
  }
}
