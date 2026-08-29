import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { imageSize } from 'image-size';
import type { JwtPayload } from '../auth/types';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import type { CreateFitzpatrickAnalysisDto } from './dto/create-fitzpatrick-analysis.dto';
import { FitzpatrickService } from './fitzpatrick.service';

const FITZPATRICK_PROVIDER_SLUG = 'fitzpatrick';
// docs/ai_fitzpatrick_skin_type.md — "File Specs & Errors": lado corto ≥320px,
// lado largo ≤4096px. Mucho más permisivo que YouCam HD (1080px), no hace
// falta lógica de upscale — solo se rechaza lo genuinamente muy pequeño.
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
    private readonly subscriptions: SubscriptionsService,
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
    );
    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      userId,
      FITZPATRICK_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException(
        'No tienes una suscripción activa de análisis de fototipo',
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

    const { width, height } = imageSize(image);
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    if (shortSide < MIN_SHORT_SIDE_PX || longSide > MAX_LONG_SIDE_PX) {
      throw new BadRequestException(
        `La imagen debe tener el lado corto de al menos ${MIN_SHORT_SIDE_PX}px y el lado largo de máximo ${MAX_LONG_SIDE_PX}px (esta es ${width}x${height}px).`,
      );
    }

    const fileId = await this.fitzpatrick.uploadImage(image);
    const taskId = await this.fitzpatrick.startTask(fileId);
    const result = await this.pollUntilDone(taskId);

    const analysis = await this.prisma.$transaction(async (tx) => {
      const created = await tx.analysis.create({
        data: {
          patientId: BigInt(dto.patientId),
          userId,
          providerId: subscription.plan.analysisProviderId,
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
      await this.storage.upload(originalKey, image, 'image/jpeg');
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
