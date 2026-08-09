import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  YOUCAM_HD_MIN_SHORT_SIDE_PX,
  YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX,
  YOUCAM_UPSCALE_TARGET_SHORT_SIDE_PX,
} from '@piel360/shared';
import type { Queue } from 'bullmq';
import { imageSize } from 'image-size';
import sharp from 'sharp';
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
    const shortSide = Math.min(width, height);
    let uploadBuffer = image;

    if (shortSide < YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX) {
      throw new BadRequestException(
        `La foto es de muy baja resolución para el análisis HD (mínimo ${YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX}px en el lado corto, esta tiene ${shortSide}px). Toma la foto de nuevo con mejor calidad.`,
      );
    }

    if (shortSide < YOUCAM_HD_MIN_SHORT_SIDE_PX) {
      // Recorte marginal (ej. 1080×1058, visto en producción con capturas de
      // iPad) — a diferencia de una foto genuinamente de baja calidad
      // (bloqueada arriba), un upscale de unos pocos % no pierde calidad
      // perceptible y evita perder el análisis por error_below_min_image_size.
      const scale = YOUCAM_UPSCALE_TARGET_SHORT_SIDE_PX / shortSide;
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);
      uploadBuffer = await sharp(image)
        .resize(targetWidth, targetHeight, { fit: 'fill' })
        .jpeg({ quality: 92 })
        .toBuffer();
      this.logger.log(
        `Análisis: imagen redimensionada de ${width}x${height} a ${targetWidth}x${targetHeight} (lado corto ${shortSide}px < ${YOUCAM_HD_MIN_SHORT_SIDE_PX}px) para cumplir el mínimo HD de YouCam`,
      );
    }

    const fileId = await this.youcam.uploadImage(uploadBuffer);
    // Siempre false: necesitamos la selfie original + máscaras transparentes
    // por separado para poder superponerlas en el frontend (una sola capa en
    // youcam-results-section.tsx, o las 8 del overview "Salud de la piel") —
    // con enable_mask_overlay:true YouCam hornea la foto dentro de cada
    // máscara (opaca) y no queda foto original que mostrar.
    const taskId = await this.youcam.startAnalysis(fileId, false);

    const analysis = await this.prisma.analysis.create({
      data: {
        patientId: BigInt(dto.patientId),
        userId,
        providerId: subscription.plan.analysisProviderId,
        youcamTaskId: taskId,
        imagePath: 'youcam',
        bodyRegion: dto.bodyRegion,
        xCoord: dto.xCoord,
        yCoord: dto.yCoord,
        zCoord: dto.zCoord,
        isValid: false,
      },
    });

    const originalKey = `analyses/${analysis.id}/original.jpg`;
    try {
      // `uploadBuffer` (no `image`): si se redimensionó arriba, debe
      // coincidir en dimensiones con las máscaras que YouCam va a generar
      // a partir de esa misma versión — si no, quedarían desalineadas al
      // superponerlas en el frontend.
      await this.storage.upload(originalKey, uploadBuffer, 'image/jpeg');
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
