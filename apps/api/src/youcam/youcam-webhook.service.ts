import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { YouCamWebhookPayload } from '@piel360/shared';
import { Webhook, WebhookVerificationError } from 'svix';
import { PrismaService } from '../prisma/prisma.service';
import { YoucamResultsService } from './youcam-results.service';
import { YouCamService } from './youcam.service';

// Placeholder base64 válido para cuando YOUCAM_WEBHOOK_SECRET aún no está
// configurado (feature opcional hasta tener credenciales reales) — el
// constructor de `Webhook` exige un secreto no vacío y, si no empieza con
// `whsec_`, lo trata como base64 directo; sin esto, un .env vacío tumba el
// arranque entero de Nest (mismo problema que tuvo GoogleStrategy).
const NOT_CONFIGURED_SECRET = `whsec_${Buffer.from('not-configured-not-configured-32').toString('base64')}`;

/**
 * `POST /youcam/webhook` — verificación estilo Svix (INTEGRACIONES-IA.md §2.5).
 * El paquete `svix` acepta directamente los headers `webhook-id`/
 * `webhook-timestamp`/`webhook-signature` y el secreto `whsec_...` sin
 * decodificación manual.
 */
@Injectable()
export class YoucamWebhookService {
  private readonly logger = new Logger(YoucamWebhookService.name);
  private readonly webhook: Webhook;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly youcam: YouCamService,
    private readonly results: YoucamResultsService,
  ) {
    this.webhook = new Webhook(
      config.get<string>('YOUCAM_WEBHOOK_SECRET') || NOT_CONFIGURED_SECRET,
    );
  }

  async handle(rawBody: Buffer, headers: Record<string, string>) {
    let payload: YouCamWebhookPayload;
    try {
      payload = this.webhook.verify(rawBody, headers) as YouCamWebhookPayload;
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new ForbiddenException('Firma de webhook inválida');
      }
      throw error;
    }

    const { taskId, taskStatus } = payload.data;
    const analysis = await this.prisma.analysis.findFirst({
      where: { youcamTaskId: taskId },
    });

    if (!analysis) {
      // Bug documentado en Laravel (taskId no siempre matchea) — causó un
      // incidente en producción cuando esto lanzaba 500 y YouCam reintentaba
      // sin parar. Responder 200 corta el retry storm; el job de polling
      // sigue siendo la vía de respaldo confiable.
      // Diagnóstico temporal (nota de latencia YouCam, jul/2026): loguear el
      // payload completo y el svix-id, no solo el taskId, para poder rastrear
      // por qué no matchea la próxima vez que ocurra — quitar una vez resuelto.
      this.logger.warn(
        `Webhook YouCam: no se encontró Analysis para taskId=${taskId}. Payload completo: ${JSON.stringify(payload)}. webhook-id=${headers['webhook-id']}`,
      );
      return { received: true };
    }

    if (analysis.isValid) return { received: true }; // ya lo procesó el polling

    // El payload del webhook solo trae taskId/taskStatus (sin el mensaje de
    // error) — `checkStatus` es la fuente de verdad única, igual que usa el
    // job de respaldo, para no duplicar lógica de éxito/error en dos lugares.
    if (taskStatus === 'success' || taskStatus === 'error') {
      const result = await this.youcam.checkStatus(taskId);
      if (result.status === 'success') {
        await this.results.applySuccess(analysis.id, result.results);
      } else if (result.status === 'error') {
        await this.results.applyError(analysis.id, result.message);
      }
    }

    return { received: true };
  }
}
