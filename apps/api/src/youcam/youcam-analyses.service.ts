import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { imageSize } from 'image-size';
import type { JwtPayload } from '../auth/types';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { CreateYoucamAnalysisDto } from './dto/create-youcam-analysis.dto';
import { YOUCAM_POLL_QUEUE, type YoucamPollJobData } from './queues';
import { YouCamService } from './youcam.service';

const YOUCAM_PROVIDER_SLUG = 'youcam';
const POLL_ATTEMPTS = 20;
// Medido en producción (nota de latencia YouCam, jul/2026): el webhook llega
// en 4-9s, así que el primer chequeo del job de respaldo no necesita esperar
// 30s — antes ambos usaban la misma constante, inflando la latencia percibida
// aun cuando YouCam ya tenía la respuesta lista.
const POLL_INITIAL_DELAY_MS = 8_000;
const POLL_BACKOFF_DELAY_MS = 15_000;
// Todas nuestras dst_actions son "hd_*" (constants.ts#YOUCAM_DST_ACTIONS) — HD
// Skincare exige al menos 1080px en el lado corto (docs/youcam_aiskinanalysis.MD
// "File Specs & Errors"), no los 480px de SD. Subir una foto por debajo de eso
// solo desperdicia la llamada (YouCam la rechaza con error_below_min_image_size).
const YOUCAM_HD_MIN_SHORT_SIDE_PX = 1080;

@Injectable()
export class YoucamAnalysesService {
  private readonly logger = new Logger(YoucamAnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youcam: YouCamService,
    private readonly subscriptions: SubscriptionsService,
    private readonly patients: PatientsService,
    private readonly storage: StorageService,
    @InjectQueue(YOUCAM_POLL_QUEUE)
    private readonly pollQueue: Queue<YoucamPollJobData>,
  ) {}

  /** `POST /youcam/analyses` — MIGRACION.md §2.5/§4.2. */
  async createAnalysis(
    dto: CreateYoucamAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    await this.patients.findOne(dto.patientId, currentUser); // scoping, igual que Skiniver

    const userId = BigInt(currentUser.sub);
    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      userId,
      YOUCAM_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException(
        'No tienes una suscripción activa de YouCam',
      );
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
    // El crédito NO se consume aquí — se consume al completarse (asimetría
    // intencional vs. Skiniver, MIGRACION.md deuda #4).

    const { width, height } = imageSize(image);
    if (Math.min(width, height) < YOUCAM_HD_MIN_SHORT_SIDE_PX) {
      throw new BadRequestException(
        `La foto es de muy baja resolución para el análisis HD (mínimo ${YOUCAM_HD_MIN_SHORT_SIDE_PX}px en el lado corto, esta tiene ${Math.min(width, height)}px). Toma la foto de nuevo con mejor calidad.`,
      );
    }

    const fileId = await this.youcam.uploadImage(image);
    const taskId = await this.youcam.startAnalysis(
      fileId,
      dto.enableMaskOverlay ?? true,
    );

    const analysis = await this.prisma.analysis.create({
      data: {
        patientId: BigInt(dto.patientId),
        userId,
        youcamTaskId: taskId,
        // YouCam no requiere que persistamos la selfie original cuando las
        // máscaras vienen mezcladas con la foto (enableMaskOverlay: true) —
        // ya vive horneada en cada máscara. Solo la guardamos aparte cuando
        // enableMaskOverlay es false (ver abajo), para poder dibujar cada
        // máscara cruda sobre esta foto en el frontend.
        imagePath: 'youcam',
        bodyRegion: dto.bodyRegion,
        xCoord: dto.xCoord,
        yCoord: dto.yCoord,
        zCoord: dto.zCoord,
        isValid: false,
      },
    });

    if (dto.enableMaskOverlay === false) {
      const originalKey = `analyses/${analysis.id}/original.jpg`;
      try {
        await this.storage.upload(originalKey, image, 'image/jpeg');
        await this.prisma.analysis.update({
          where: { id: analysis.id },
          data: { imagePath: originalKey },
        });
      } catch (error) {
        // No bloquear la creación por una falla de storage — mismo criterio
        // de tolerancia que analyses.service.ts#create con Skiniver.
        this.logger.warn(
          `No se pudo subir la foto original del análisis ${analysis.id}: ${String(error)}`,
        );
      }
    }

    await this.pollQueue.add(
      'poll',
      { analysisId: analysis.id.toString(), taskId },
      {
        attempts: POLL_ATTEMPTS,
        backoff: { type: 'exponential', delay: POLL_BACKOFF_DELAY_MS },
        delay: POLL_INITIAL_DELAY_MS,
      },
    );

    return { analysisId: analysis.id.toString() };
  }
}
