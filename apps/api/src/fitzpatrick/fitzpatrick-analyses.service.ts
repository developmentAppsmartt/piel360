import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { FitzpatrickResult } from '@piel360/shared';
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
import {
  buscarCaptura,
  captureSha256,
  mensajeDeAnalisisFallido,
  recentAnalysisKey,
  rememberRecentAnalysis,
  reuseRecentAnalysis,
} from '../analyses/recent-analysis-create';

const FITZPATRICK_PROVIDER_SLUG = 'fitzpatrick';
// docs/ai_fitzpatrick_skin_type.md — "File Specs & Errors": lado corto ≥320px,
// lado largo ≤4096px. Si la captura se pasa de largo, se achica. Solo se
// rechaza lo que queda por debajo del mínimo.
const MIN_SHORT_SIDE_PX = 320;
const MAX_LONG_SIDE_PX = 4096;
// La tarea es una sola clasificación (sin máscaras que descargar). Se consulta
// el mismo task_id hasta success o error. Un corte no abre otra tarea.
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 20_000;
const POLL_SEGUNDO_PLANO_MS = 180_000;
const seguimientos = new Set<string>();

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

  /** `POST /fitzpatrick/analyses` — abre la tarea una sola vez por foto.
   * La fila queda guardada en cuanto hay `task_id`. Lo demás es consultar
   * esa tarea hasta `success` o `error`. */
  async createAnalysis(
    dto: CreateFitzpatrickAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    const key = recentAnalysisKey({
      userId: currentUser.sub,
      patientId: dto.patientId,
      image,
    });
    const reused = reuseRecentAnalysis(key);
    if (reused) return reused;
    return rememberRecentAnalysis(
      key,
      this.createAnalysisInner(dto, image, currentUser),
    );
  }

  private async createAnalysisInner(
    dto: CreateFitzpatrickAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    await this.patients.findOne(dto.patientId, currentUser);

    const userId = BigInt(currentUser.sub);
    const patientId = BigInt(dto.patientId);
    const sha = captureSha256(image);
    await this.specialtyAccess.assertCanUseProvider(
      userId,
      FITZPATRICK_PROVIDER_SLUG,
      { patientId: dto.patientId },
    );
    const providerId = await getAnalysisProviderIdBySlug(
      this.prisma,
      FITZPATRICK_PROVIDER_SLUG,
    );
    const yaAbierto = await buscarCaptura(this.prisma, {
      patientId,
      userId,
      providerId,
      captureSha256: sha,
    });
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
    if (yaAbierto?.fitzpatrickTaskId) {
      const fallo = mensajeDeAnalisisFallido(yaAbierto.aiRawResponse);
      if (fallo) throw new BadRequestException(fallo);
      if (!yaAbierto.isValid) {
        await this.cerrarEnPeticion(
          yaAbierto.id,
          yaAbierto.fitzpatrickTaskId,
          patientId,
          subscription?.id ?? null,
        );
      }
      return { analysisId: yaAbierto.id.toString() };
    }
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

    let upload = image;
    let { width, height } = imageSize(upload);
    width = width ?? 0;
    height = height ?? 0;
    let longSide = Math.max(width, height);
    if (width > 0 && height > 0 && longSide > MAX_LONG_SIDE_PX) {
      const scale = MAX_LONG_SIDE_PX / longSide;
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      upload = await sharp(image)
        .resize(targetWidth, targetHeight, { fit: 'fill' })
        .jpeg({ quality: 92 })
        .toBuffer();
      const resized = imageSize(upload);
      width = resized.width ?? targetWidth;
      height = resized.height ?? targetHeight;
      longSide = Math.max(width, height);
      this.logger.log(
        `Fototipo: imagen redimensionada a ${width}x${height} para no pasar de ${MAX_LONG_SIDE_PX}px`,
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
    const analysis = await this.prisma.analysis.create({
      data: {
        patientId,
        userId,
        providerId,
        fitzpatrickTaskId: taskId,
        captureSha256: sha,
        imagePath: 'analyses/pending/original.jpg',
        isValid: false,
      },
    });
    await this.guardarFoto(analysis.id, upload);
    await this.cerrarEnPeticion(
      analysis.id,
      taskId,
      patientId,
      subscription.id,
    );
    return { analysisId: analysis.id.toString() };
  }

  /** GET del mismo task_id. Si se acaba el tiempo, sigue en segundo plano. */
  private async cerrarEnPeticion(
    analysisId: bigint,
    taskId: string,
    patientId: bigint,
    subscriptionId: bigint | null,
  ) {
    try {
      const result = await this.esperarResultado(taskId, POLL_TIMEOUT_MS);
      if (result) {
        await this.guardarExito(analysisId, patientId, subscriptionId, result);
        return;
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        await this.guardarFallo(analysisId, err.message);
      }
      throw err;
    }
    this.seguirEnSegundoPlano(analysisId, taskId, patientId, subscriptionId);
    throw new BadRequestException(
      'El análisis de fototipo sigue en proceso. No se volvió a enviar la foto.',
    );
  }

  private seguirEnSegundoPlano(
    analysisId: bigint,
    taskId: string,
    patientId: bigint,
    subscriptionId: bigint | null,
  ) {
    const key = analysisId.toString();
    if (seguimientos.has(key)) return;
    seguimientos.add(key);
    void this.esperarResultado(taskId, POLL_SEGUNDO_PLANO_MS)
      .then(async (result) => {
        if (result) {
          await this.guardarExito(
            analysisId,
            patientId,
            subscriptionId,
            result,
          );
        }
      })
      .catch(async (err: unknown) => {
        if (err instanceof BadRequestException) {
          await this.guardarFallo(analysisId, err.message);
          return;
        }
        this.logger.warn(`Fototipo ${key} sigue sin resultado: ${String(err)}`);
      })
      .finally(() => seguimientos.delete(key));
  }

  /** `null` = sigue en proceso. `error` del proveedor no se reintenta. */
  private async esperarResultado(
    taskId: string,
    timeoutMs: number,
  ): Promise<FitzpatrickResult | null> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const check = await this.fitzpatrick.checkStatus(taskId);
      if (check.status === 'success') return check.result;
      if (check.status === 'error') {
        throw new BadRequestException(check.message);
      }
      if (Date.now() >= deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  private async guardarExito(
    analysisId: bigint,
    patientId: bigint,
    subscriptionId: bigint | null,
    result: FitzpatrickResult,
  ) {
    const claimed = await this.prisma.analysis.updateMany({
      where: { id: analysisId, isValid: false },
      data: {
        isValid: true,
        aiDiagnosis: `Tipo ${result.fitzpatrick_scale}`,
        aiRawResponse: result as unknown as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) return;
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { fitzpatrickType: result.fitzpatrick_scale },
    });
    if (subscriptionId == null) return;
    try {
      await this.subscriptions.consumeCredit(
        this.prisma,
        subscriptionId,
        analysisId,
      );
    } catch (err) {
      // analysisId es único en el uso: la otra consulta ya cobró el cupo.
      this.logger.warn(`Crédito de fototipo ${analysisId}: ${String(err)}`);
    }
  }

  private async guardarFallo(analysisId: bigint, message: string) {
    await this.prisma.analysis.updateMany({
      where: { id: analysisId, isValid: false },
      data: { aiRawResponse: { error: true, message } },
    });
  }

  private async guardarFoto(analysisId: bigint, upload: Buffer) {
    const originalKey = `analyses/${analysisId}/original.jpg`;
    try {
      await this.storage.upload(originalKey, upload, 'image/jpeg');
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { imagePath: originalKey },
      });
    } catch (error) {
      // No bloquear la respuesta por una falla de storage — mismo criterio
      // de tolerancia que analyses.service.ts/youcam-analyses.service.ts.
      this.logger.warn(
        `No se pudo subir la foto original del análisis ${analysisId}: ${String(error)}`,
      );
    }
  }
}
