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
import type { SkiniverPrediction, YouCamResults } from '@piel360/shared';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkiniverService } from '../skiniver/skiniver.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { youcamMaskKey } from '../youcam/mask-key.util';
import type { JwtPayload } from '../auth/types';
import type { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import type { CreateAnalysisDto } from './dto/create-analysis.dto';
import {
  ANALYSIS_IMAGES_QUEUE,
  ENCYCLOPEDIA_QUEUE,
  type AnalysisImagesJobData,
  type EncyclopediaJobData,
} from './queues';

const SKINIVER_PROVIDER_SLUG = 'skiniver';

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

    return this.withImageUrls(updated);
  }

  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === 'admin') {
      return this.prisma.analysis.findMany({
        include: { patient: true },
        orderBy: { id: 'desc' },
      });
    }

    if (currentUser.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      return this.prisma.analysis.findMany({
        where: { patient: { doctorId: doctor.id } },
        include: { patient: true },
        orderBy: { id: 'desc' },
      });
    }

    return this.prisma.analysis.findMany({
      where: { userId: BigInt(currentUser.sub) },
      include: { patient: true },
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
    return this.withImageUrls(analysis);
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
    return this.withImageUrls(updated);
  }

  /** Las columnas *S3Url/imagePath solo guardan la key del bucket propio — se
   * agregan URLs firmadas navegables sin tocar los campos crudos. Para
   * análisis YouCam (youcamTaskId presente) también arma `masks` — a
   * diferencia de Skiniver, YouCam no usa coloredS3Url/maskedS3Url sino una
   * máscara por métrica en `analyses/{id}/masks/{type}` (sin extensión en la
   * key, ver youcam-results.service.ts). */
  private async withImageUrls<
    T extends {
      imagePath: string;
      coloredS3Url: string | null;
      maskedS3Url: string | null;
      youcamTaskId: string | null;
      aiRawResponse: Prisma.JsonValue | null;
      id: bigint;
    },
  >(analysis: T) {
    // Fallback temporal (mismo criterio que signYoucamMasks): si nuestra copia
    // propia aún no existe o no se puede firmar (sin credenciales S3 reales),
    // usar directamente la URL que ya da Skiniver — a diferencia de YouCam no
    // trae expiración por query string, así que sirve como respaldo estable
    // mientras no haya bucket propio configurado.
    const prediction =
      !analysis.youcamTaskId && analysis.aiRawResponse
        ? (analysis.aiRawResponse as unknown as SkiniverPrediction)
        : null;

    const [imageUrl, signedColoredUrl, signedMaskedUrl, masks] =
      await Promise.all([
        this.signIfPresent(analysis.imagePath),
        this.signIfPresent(analysis.coloredS3Url),
        this.signIfPresent(analysis.maskedS3Url),
        this.signYoucamMasks(analysis),
      ]);
    const coloredUrl = signedColoredUrl ?? prediction?.colored_s3_url ?? null;
    const maskedUrl = signedMaskedUrl ?? prediction?.masked_s3_url ?? null;
    return { ...analysis, imageUrl, coloredUrl, maskedUrl, masks };
  }

  private async signYoucamMasks(analysis: {
    youcamTaskId: string | null;
    aiRawResponse: Prisma.JsonValue | null;
    id: bigint;
  }): Promise<{ type: string; region?: string; url: string }[]> {
    if (!analysis.youcamTaskId || !analysis.aiRawResponse) return [];

    const results = analysis.aiRawResponse as unknown as YouCamResults;
    const items = (results.output ?? []).filter(
      (item) => item.mask_urls?.length,
    );

    const signed = await Promise.all(
      items.map(
        async (
          item,
        ): Promise<{ type: string; region?: string; url: string } | null> => {
          const key = `analyses/${analysis.id}/masks/${youcamMaskKey(item)}`;
          const signedUrl = await this.signIfPresent(key);
          // Fallback temporal mientras el bucket propio no tenga credenciales
          // reales (o la copia aún no se haya descargado): usar la URL que
          // ya da YouCam directamente — temporal (~2h) pero deja el flujo
          // usable en desarrollo sin depender de S3_REGION/S3_BUCKET.
          const url = signedUrl ?? item.mask_urls[0] ?? null;
          return url ? { type: item.type, region: item.region, url } : null;
        },
      ),
    );
    return signed.filter(
      (m): m is { type: string; region?: string; url: string } => m !== null,
    );
  }

  private async signIfPresent(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key);
    } catch (error) {
      // getSignedUrl puede fallar sin red (ej. falta S3_REGION) — no debe
      // tumbar toda la respuesta del análisis por esto.
      this.logger.warn(`No se pudo firmar la URL de ${key}: ${String(error)}`);
      return null;
    }
  }

  private async assertCanAccess(
    analysis: { userId: bigint | null; patient: { doctorId: bigint | null } },
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === 'admin') return;

    if (currentUser.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(currentUser.sub);
      if (analysis.patient.doctorId === doctor.id) return;
      throw new ForbiddenException('Este análisis no pertenece a tu consulta');
    }

    if (analysis.userId?.toString() === currentUser.sub) return;
    throw new ForbiddenException('No puedes acceder a este análisis');
  }
}
