import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkiniverService } from '../skiniver/skiniver.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { JwtPayload } from '../auth/types';
import { AnalysisImageUrlsService } from './analysis-image-urls.service';
import type { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import type { CreateAnalysisDto } from './dto/create-analysis.dto';
import {
  ANALYSIS_IMAGES_QUEUE,
  ENCYCLOPEDIA_QUEUE,
  type AnalysisImagesJobData,
  type EncyclopediaJobData,
} from './queues';

const SKINIVER_PROVIDER_SLUG = 'skiniver';

function isDoctorPanelRole(role: Role): boolean {
  return (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
}

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skiniver: SkiniverService,
    private readonly subscriptions: SubscriptionsService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly storage: StorageService,
    private readonly imageUrls: AnalysisImageUrlsService,
    @InjectQueue(ANALYSIS_IMAGES_QUEUE)
    private readonly analysisImagesQueue: Queue<AnalysisImagesJobData>,
    @InjectQueue(ENCYCLOPEDIA_QUEUE)
    private readonly encyclopediaQueue: Queue<EncyclopediaJobData>,
  ) {}

  /** Flujo completo Skiniver — MIGRACION.md §4.1. */
  async performAnalysis(
    dto: CreateAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    // Verifica que el usuario puede operar sobre este paciente (scoping).
    await this.patients.findOne(dto.patientId, currentUser);

    const userId = BigInt(currentUser.sub);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      userId,
      SKINIVER_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException('No tienes una suscripción activa');
    }

    const remaining = await this.subscriptions.remainingCredits(
      this.prisma,
      subscription.id,
      subscription.plan.analysisLimit,
    );
    if (remaining <= 0) {
      throw new BadRequestException(
        'Has agotado los análisis disponibles de tu plan',
      );
    }

    const validation = await this.skiniver.validate(image);
    if (!validation.isgood) {
      throw new BadRequestException(
        `La imagen no es apta para análisis clínico (Score: ${validation.prob})`,
      );
    }

    const prediction = await this.skiniver.predict(
      image,
      user.diagnosticLanguage,
    );

    const analysis = await this.prisma.$transaction(async (tx) => {
      const remainingInTx = await this.subscriptions.remainingCredits(
        tx,
        subscription.id,
        subscription.plan.analysisLimit,
      );
      if (remainingInTx <= 0) {
        throw new BadRequestException(
          'Has agotado los análisis disponibles de tu plan',
        );
      }

      const created = await tx.analysis.create({
        data: {
          patientId: BigInt(dto.patientId),
          userId,
          providerId: subscription.plan.analysisProviderId,
          imagePath: `analyses/pending/original.jpg`,
          bodyRegion: dto.bodyRegion,
          xCoord: dto.xCoord,
          yCoord: dto.yCoord,
          zCoord: dto.zCoord,
          isValid: true,
          // La API real de Skiniver devuelve `prob` como string (ej. "91"),
          // aunque el tipo declarado sea number — confirmado en vivo, no es
          // un artefacto de mock. Normalizar antes de persistir (Prisma
          // rechaza un string en una columna Float).
          validationScore: Number(validation.prob),
          aiDiagnosis: prediction.class,
          aiProbability:
            prediction.prob > 1 ? prediction.prob / 100 : prediction.prob,
          aiRawResponse: prediction as unknown as Prisma.InputJsonValue,
        },
      });

      await this.subscriptions.consumeCredit(tx, subscription.id, created.id);

      return created;
    });

    const originalKey = `analyses/${analysis.id}/original.jpg`;
    try {
      await this.storage.upload(originalKey, image, 'image/jpeg');
    } catch (error) {
      // No bloquear la creación (crédito ya consumido, predicción ya lista)
      // por una falla de storage — mismo criterio de tolerancia que
      // analysis-images.processor.ts para colored/masked.
      this.logger.warn(
        `No se pudo subir la foto original del análisis ${analysis.id}: ${String(error)}`,
      );
    }
    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: { imagePath: originalKey },
    });

    await this.analysisImagesQueue.add('download', {
      analysisId: analysis.id.toString(),
      coloredUrl: prediction.colored_s3_url,
      maskedUrl: prediction.masked_s3_url,
    });

    for (const candidate of prediction.topn) {
      if (candidate.atlas_page_link) {
        await this.encyclopediaQueue.add('process', {
          url: candidate.atlas_page_link,
        });
      }
    }

    return this.imageUrls.withImageUrls(updated);
  }

  async findAll(currentUser: JwtPayload) {
    // `provider.displayLabel` — filas creadas antes de este campo (o sin
    // providerId poblado) no traen relación; el frontend cae al heurístico
    // por youcamTaskId como respaldo.
    const providerSelect = { select: { displayLabel: true } };

    if (currentUser.role === 'superadmin') {
      return this.prisma.analysis.findMany({
        include: { patient: true, provider: providerSelect },
        orderBy: { id: 'desc' },
      });
    }

    if (isDoctorPanelRole(currentUser.role)) {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      return this.prisma.analysis.findMany({
        where: { patient: { doctorId: doctor.id } },
        include: { patient: true, provider: providerSelect },
        orderBy: { id: 'desc' },
      });
    }

    // Paciente: solo análisis compartidos de su perfil (Patient.userId).
    return this.prisma.analysis.findMany({
      where: {
        sharedWithPatient: true,
        patient: { userId: BigInt(currentUser.sub) },
      },
      include: { patient: true, provider: providerSelect },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    await this.assertCanAccess(analysis, currentUser);
    return this.imageUrls.withImageUrls(analysis);
  }

  async confirm(id: string, dto: ConfirmAnalysisDto, currentUser: JwtPayload) {
    const analysis = await this.findOne(id, currentUser);

    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        isConfirmed: true,
        isCorrected: dto.isCorrected ?? false,
        finalDiagnosis: dto.finalDiagnosis ?? analysis.aiDiagnosis,
        doctorNotes: dto.doctorNotes,
        confirmedById: BigInt(currentUser.sub),
        confirmedAt: new Date(),
      },
    });
    return this.imageUrls.withImageUrls(updated);
  }

  /**
   * Doctor/admin publica el análisis al paciente vinculado
   * (`Patient.userId`). Sin ese vínculo el paciente no podrá listarlo.
   */
  async shareWithPatient(id: string, currentUser: JwtPayload) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    await this.assertCanAccess(analysis, currentUser);

    if (!analysis.patient.userId) {
      throw new BadRequestException(
        'Este paciente aún no tiene cuenta en la app. Debe registrarse o vincularse antes de compartir el análisis.',
      );
    }

    if (analysis.sharedWithPatient) {
      return this.imageUrls.withImageUrls(analysis);
    }

    const updated = await this.prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        sharedWithPatient: true,
        sharedAt: new Date(),
      },
      include: { patient: true },
    });
    return this.imageUrls.withImageUrls(updated);
  }

  private async assertCanAccess(
    analysis: {
      userId: bigint | null;
      sharedWithPatient: boolean;
      patient: { doctorId: bigint | null; userId: bigint | null };
    },
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === 'superadmin') return;

    if (isDoctorPanelRole(currentUser.role)) {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      if (analysis.patient.doctorId === doctor.id) return;
      throw new ForbiddenException('Este análisis no pertenece a tu consulta');
    }

    // Paciente: solo si el análisis fue compartido y pertenece a su perfil.
    if (
      analysis.sharedWithPatient &&
      analysis.patient.userId?.toString() === currentUser.sub
    ) {
      return;
    }

    // Compat: análisis autoejecutados por el propio paciente (userId = ejecutor).
    if (analysis.userId?.toString() === currentUser.sub) return;

    throw new ForbiddenException('No puedes acceder a este análisis');
  }
}
