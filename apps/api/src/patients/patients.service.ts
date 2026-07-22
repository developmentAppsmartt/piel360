import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { JwtPayload } from '../auth/types';
import { DoctorsService } from '../doctors/doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePatientDto } from './dto/create-patient.dto';
import type { SurveyDto } from './dto/survey.dto';
import type { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
  ) {}

  /** Scoping (MIGRACION.md §2.5/§2.6): doctor solo ve los suyos, patient
   * solo se ve a sí mismo, admin ve todos. */
  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === 'admin') {
      return this.prisma.patient.findMany({ orderBy: { id: 'asc' } });
    }

    if (currentUser.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      return this.prisma.patient.findMany({
        where: { doctorId: doctor.id },
        orderBy: { id: 'asc' },
      });
    }

    const own = await this.requireOwnPatient(currentUser.sub);
    return [own];
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(id) },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    await this.assertCanAccess(patient, currentUser);
    return patient;
  }

  async create(dto: CreatePatientDto, currentUser: JwtPayload) {
    let doctorId: bigint | undefined;
    if (currentUser.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      doctorId = doctor.id;
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException(
        'Solo doctores o admins pueden crear pacientes',
      );
    }

    const { birthDate, ...rest } = dto;
    return this.prisma.patient.create({
      data: {
        ...rest,
        doctorId,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
    });
  }

  async update(id: string, dto: UpdatePatientDto, currentUser: JwtPayload) {
    const patient = await this.findOne(id, currentUser);
    const { birthDate, ...rest } = dto;
    return this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...rest,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
    });
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
   * (MIGRACION.md §2.5): coords x/y/z de cada análisis sobre el modelo corporal. */
  async findAnalyses(id: string, currentUser: JwtPayload, withCoords: boolean) {
    const patient = await this.findOne(id, currentUser);

    return this.prisma.analysis.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'asc' },
      select: withCoords
        ? {
            id: true,
            bodyRegion: true,
            xCoord: true,
            yCoord: true,
            zCoord: true,
            aiDiagnosis: true,
            createdAt: true,
          }
        : undefined,
    });
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
    if (currentUser.role === 'admin') return;

    if (currentUser.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      if (patient.doctorId === doctor.id) return;
      throw new ForbiddenException('Este paciente no pertenece a tu consulta');
    }

    if (patient.userId?.toString() === currentUser.sub) return;
    throw new ForbiddenException('No puedes acceder a este paciente');
  }
}
