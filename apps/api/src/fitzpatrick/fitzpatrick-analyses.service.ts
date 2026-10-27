import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { imageSize } from 'image-size';
import sharp from 'sharp';
import type { JwtPayload } from '../auth/types';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionCreditsService } from '../subscriptions/subscription-credits.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import { getAnalysisProviderIdBySlug } from '../plans/plan-providers.util';
import type { CreateFitzpatrickAnalysisDto } from './dto/create-fitzpatrick-analysis.dto';
import { FitzpatrickService } from './fitzpatrick.service';

const FITZPATRICK_PROVIDER_SLUG = 'fitzpatrick';
// docs/ai_fitzpatrick_skin_type.md — "File Specs & Errors": lado corto ≥320px,
// lado largo ≤4096px. Si la captura se pasa de largo, se achica. Solo se
// rechaza lo que queda por debajo del mínimo.
const MIN_SHORT_SIDE_PX = 320;
const MAX_LONG_SIDE_PX = 4096;
// La tarea es una sola clasificación (sin máscaras que descargar) — se hace
// polling síncrono corto en vez de replicar la cola/webhook de YouCam.
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 20_000;

@Injectable()
export class FitzpatrickAnalysesService {
  private readonly logger = new Logger(FitzpatrickAnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fitzpatrick: FitzpatrickService,
    private readonly subscriptions: SubscriptionCreditsService,
    private readonly patients: PatientsService,
    private readonly storage: StorageService,
    private readonly specialtyAccess: SpecialtyAccessService,
  ) {}

  /** `POST /fitzpatrick/analyses` — polling síncrono (ver plan de sesión):
   * sube la imagen, crea la tarea, espera el resultado dentro de la misma
   * petición HTTP y ya crea el `Analysis` completo. */
  async createAnalysis(
    dto: CreateFitzpatrickAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    await this.patients.findOne(dto.patientId, currentUser);

    const userId = BigInt(currentUser.sub);
    await this.specialtyAccess.assertCanUseProvider(
      userId,
      FITZPATRICK_PROVIDER_SLUG,
      { patientId: dto.patientId },
    );
    const billingUserId =
      await this.subscriptions.resolveBillingUserIdForAnalysis(
        userId,
        dto.patientId,
      );
    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      billingUserId,
      FITZPATRICK_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException(
        'Suscripción no disponible. Análisis de Fototipo Piel 360',
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

    const meta = await sharp(image).metadata();
    const orientation = meta.orientation ?? 1;
    const swapSides =
      orientation === 5 ||
      orientation === 6 ||
      orientation === 7 ||
      orientation === 8;
    let width = meta.width ?? 0;
    let height = meta.height ?? 0;
    if (swapSides) [width, height] = [height, width];
    let upload = image;
    let longSide = Math.max(width, height);
    if (width > 0 && height > 0 && (orientation > 1 || longSide > MAX_LONG_SIDE_PX)) {
      let pipeline = sharp(image).rotate();
      if (longSide > MAX_LONG_SIDE_PX) {
        const scale = MAX_LONG_SIDE_PX / longSide;
        pipeline = pipeline.resize(
          Math.max(1, Math.round(width * scale)),
          Math.max(1, Math.round(height * scale)),
          { fit: 'fill' },
        );
      }
      upload = await pipeline.jpeg({ quality: 92 }).toBuffer();
      const resized = imageSize(upload);
      width = resized.width ?? width;
      height = resized.height ?? height;
      longSide = Math.max(width, height);
      this.logger.log(
        `Fototipo: imagen preparada a ${width}x${height} (orientación ${orientation})`,
      );
    }
    const shortSide = Math.min(width, height);
    if (
      !width ||
      !height ||
      shortSide < MIN_SHORT_SIDE_PX ||
      longSide > MAX_LONG_SIDE_PX
    ) {
      throw new BadRequestException(
        `La imagen debe tener el lado corto de al menos ${MIN_SHORT_SIDE_PX}px y el lado largo de máximo ${MAX_LONG_SIDE_PX}px (esta es ${width}x${height}px).`,
      );
    }

    const fileId = await this.fitzpatrick.uploadImage(upload);
    const taskId = await this.fitzpatrick.startTask(fileId);
    const result = await this.pollUntilDone(taskId);

    const fitzpatrickProviderId = await getAnalysisProviderIdBySlug(
      this.prisma,
      FITZPATRICK_PROVIDER_SLUG,
    );

    const analysis = await this.prisma.$transaction(async (tx) => {
      const created = await tx.analysis.create({
        data: {
          patientId: BigInt(dto.patientId),
          userId,
          providerId: fitzpatrickProviderId,
          fitzpatrickTaskId: taskId,
          imagePath: `analyses/pending/original.jpg`,
          aiDiagnosis: `Tipo ${result.fitzpatrick_scale}`,
          aiRawResponse: result as unknown as Prisma.InputJsonValue,
          isValid: true,
        },
      });
      await tx.patient.update({
        where: { id: BigInt(dto.patientId) },
        data: { fitzpatrickType: result.fitzpatrick_scale },
      });
      await this.subscriptions.consumeCredit(tx, subscription.id, created.id);
      return created;
    });

    const originalKey = `analyses/${analysis.id}/original.jpg`;
    try {
      await this.storage.upload(originalKey, upload, 'image/jpeg');
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { imagePath: originalKey },
      });
    } catch (error) {
      // No bloquear la respuesta por una falla de storage — mismo criterio
      // de tolerancia que analyses.service.ts/youcam-analyses.service.ts.
      this.logger.warn(
        `No se pudo subir la foto original del análisis ${analysis.id}: ${String(error)}`,
      );
    }

    return { analysisId: analysis.id.toString() };
  }

  private async pollUntilDone(taskId: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
      const check = await this.fitzpatrick.checkStatus(taskId);
      if (check.status === 'success') return check.result;
      if (check.status === 'error')
        throw new BadRequestException(check.message);
      if (Date.now() >= deadline) {
        throw new BadRequestException(
          'El análisis de fototipo está tardando más de lo esperado — intenta de nuevo en unos minutos.',
        );
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}
