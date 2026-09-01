import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YOUCAM_DST_ACTIONS } from '@piel360/shared';
import type { YouCamResults } from '@piel360/shared';

interface UploadUrlResponse {
  data: {
    files: Array<{ file_id: string; requests: Array<{ url: string }> }>;
  };
}

interface StartAnalysisResponse {
  data: { task_id: string };
}

interface CheckStatusResponse {
  data: {
    task_status?: string;
    results?: YouCamResults;
    error?: unknown;
    // Descripción detallada del error (V2.1.MD) — `error` es solo el código
    // (ej. "error_no_face"), este campo trae el mensaje legible.
    error_message?: string;
    [key: string]: unknown;
  };
}

export type YouCamCheckStatusResult =
  | { status: 'success'; results: YouCamResults }
  | { status: 'processing' }
  | { status: 'error'; message: string };

export type PerfectCorpCreditBalance = {
  id: string;
  type: 'ApiSubsToken' | 'ApiPaygToken' | string;
  amount: number;
  expiryMs: number | null;
};

export type PerfectCorpFeatureSku = {
  description: string;
  amount: number;
  unit: string;
  procUnit: number;
  runTaskUrl: string;
};

export type PerfectCorpCreditHistoryItem = {
  id: string;
  timestampMs: number;
  action: string;
  targetId: string | null;
  delta: number;
  dstActions: string[];
};

/**
 * Cliente HTTP puro de la API server-to-server de YouCam (INTEGRACIONES-IA.md
 * §2). `Authorization: Bearer ${YOUCAM_API_KEY}` — confirmado literal en
 * `YouCamService.php` vía `Http::withToken($apiKey)`.
 *
 * También consulta saldo/costos Perfect Corp (`/s2s/v1.0/client/credit`,
 * `/s2s/v2.0/credit/feature-cost`) — misma cuenta para YouCam + Fitzpatrick.
 */
@Injectable()
export class YouCamService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('YOUCAM_API_URL');
    this.apiKey = this.config.getOrThrow<string>('YOUCAM_API_KEY');
  }

  /** `GET /s2s/v1.0/client/credit` — saldo de unidades Perfect Corp. */
  async getCreditBalances(): Promise<PerfectCorpCreditBalance[]> {
    const response = await fetch(`${this.baseUrl}/s2s/v1.0/client/credit`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      await this.throwYouCamError(response, 'PerfectCorp client/credit');
    }

    const json = (await response.json()) as {
      status?: number;
      results?: Array<{
        id?: number | string;
        type?: string;
        amount?: number;
        amount_dec?: number;
        expiry?: number;
      }>;
    };

    return (json.results ?? []).map((row) => ({
      id: String(row.id ?? ''),
      type: row.type ?? 'unknown',
      amount: Number(row.amount_dec ?? row.amount ?? 0),
      expiryMs:
        typeof row.expiry === 'number' && row.expiry > 0 ? row.expiry : null,
    }));
  }

  /** `GET /s2s/v2.0/credit/feature-cost` — costo por SKU (paginado). */
  async getFeatureCosts(maxPages = 10): Promise<PerfectCorpFeatureSku[]> {
    const skus: PerfectCorpFeatureSku[] = [];
    let startingToken: string | null = null;

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${this.baseUrl}/s2s/v2.0/credit/feature-cost`);
      url.searchParams.set('page_size', '20');
      if (startingToken) url.searchParams.set('starting_token', startingToken);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) {
        await this.throwYouCamError(response, 'PerfectCorp credit/feature-cost');
      }

      const json = (await response.json()) as {
        result?: {
          next_token?: string | null;
          skus?: Array<{
            description?: string;
            amount?: number;
            unit?: string;
            proc_unit?: number;
            run_task_url?: string;
          }>;
        };
      };

      for (const sku of json.result?.skus ?? []) {
        skus.push({
          description: sku.description ?? '',
          amount: Number(sku.amount ?? 0),
          unit: sku.unit ?? '',
          procUnit: Number(sku.proc_unit ?? 1),
          runTaskUrl: sku.run_task_url ?? '',
        });
      }

      const next = json.result?.next_token ?? null;
      if (!next) break;
      startingToken = next;
    }

    return skus;
  }

  /** `GET /s2s/v1.0/client/credit/history` — historial reciente de unidades. */
  async getCreditHistory(
    pageSize = 20,
  ): Promise<PerfectCorpCreditHistoryItem[]> {
    const url = new URL(`${this.baseUrl}/s2s/v1.0/client/credit/history`);
    url.searchParams.set('page_size', String(Math.min(Math.max(pageSize, 1), 30)));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      await this.throwYouCamError(response, 'PerfectCorp client/credit/history');
    }

    const json = (await response.json()) as {
      result?: {
        history?: Array<{
          id?: number | string;
          timestamp?: number;
          action?: string;
          target_id?: string;
          info?: {
            credits?: Array<{
              amount?: number;
              amount_dec?: number;
            }>;
            dst_actions?: string[];
          };
        }>;
      };
    };

    return (json.result?.history ?? []).map((row) => {
      const delta = (row.info?.credits ?? []).reduce((sum, c) => {
        return sum + Number(c.amount_dec ?? c.amount ?? 0);
      }, 0);
      return {
        id: String(row.id ?? ''),
        timestampMs: Number(row.timestamp ?? 0),
        action: row.action ?? 'unknown',
        targetId: row.target_id ?? null,
        delta,
        dstActions: row.info?.dst_actions ?? [],
      };
    });
  }

  async uploadImage(image: Buffer): Promise<string> {
    let declareResponse: Response;
    try {
      declareResponse = await fetch(
        `${this.baseUrl}/s2s/v2.1/file/skin-analysis`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                content_type: 'image/jpeg',
                file_name: 'photo.jpg',
                file_size: image.length,
              },
            ],
          }),
        },
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `No se pudo contactar YouCam (file/skin-analysis): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!declareResponse.ok) {
      await this.throwYouCamError(declareResponse, 'YouCam file/skin-analysis');
    }

    const json = (await declareResponse.json()) as UploadUrlResponse;
    const uploadData = json.data?.files?.[0];
    const fileId = uploadData?.file_id;
    const uploadUrl = uploadData?.requests?.[0]?.url;
    if (!fileId || !uploadUrl) {
      throw new InternalServerErrorException(
        'El JSON de YouCam no contiene file_id o la URL de subida',
      );
    }

    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: new Uint8Array(image),
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `No se pudo subir la imagen al storage de YouCam: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!uploadResponse.ok) {
      const body = await uploadResponse.text();
      throw new InternalServerErrorException(
        `Fallo al subir la imagen binaria al S3 de YouCam (${uploadResponse.status}): ${body}`,
      );
    }

    return fileId;
  }

  async startAnalysis(
    fileId: string,
    enableMaskOverlay = false,
  ): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/s2s/v2.1/task/skin-analysis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          src_file_id: fileId,
          dst_actions: YOUCAM_DST_ACTIONS,
          miniserver_args: { enable_mask_overlay: enableMaskOverlay },
          format: 'json',
          pf_camera_kit: true,
        }),
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `No se pudo contactar YouCam (task/skin-analysis): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!response.ok) {
      await this.throwYouCamError(response, 'YouCam task/skin-analysis');
    }

    const json = (await response.json()) as StartAnalysisResponse;
    const taskId = json.data?.task_id;
    if (!taskId) {
      throw new InternalServerErrorException(
        'YouCam no devolvió task_id al iniciar el análisis',
      );
    }
    return taskId;
  }

  /** No lanza en `task_status: 'error'` — YouCam puede rechazar la tarea de
   * forma permanente (ej. "Input image resolution is too small.") y no tiene
   * sentido reintentar; se devuelve como dato para que el caller decida
   * (`YoucamPollProcessor`/`YoucamWebhookService` marcan el análisis como
   * fallido en vez de reintentar 20 veces con backoff exponencial contra
   * una condición que nunca va a cambiar). */
  async checkStatus(taskId: string): Promise<YouCamCheckStatusResult> {
    const response = await fetch(
      `${this.baseUrl}/s2s/v2.1/task/skin-analysis/${taskId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    if (!response.ok) {
      await this.throwYouCamError(response, 'YouCam checkStatus');
    }

    const json = (await response.json()) as CheckStatusResponse;
    const status = json.data.task_status ?? 'processing';

    if (status === 'success') {
      return {
        status: 'success',
        results: (json.data.results ?? json.data) as YouCamResults,
      };
    }
    if (status === 'error') {
      const rawError = json.data.error;
      const message =
        json.data.error_message ??
        (typeof rawError === 'string'
          ? rawError
          : (JSON.stringify(rawError ?? json.data) ?? 'Error desconocido'));
      return { status: 'error', message };
    }
    return { status: 'processing' };
  }

  /** Restricciones de cuenta (créditos, cuota, plan) vienen como 4xx con
   * `error_code` — se tratan como error de negocio (400), no como falla
   * nuestra (500). Un 5xx de YouCam sí es un problema del proveedor. */
  private async throwYouCamError(
    response: Response,
    context: string,
  ): Promise<never> {
    const body = await response.text();
    const friendly = this.describeYouCamError(body);

    if (response.status >= 400 && response.status < 500) {
      throw new BadRequestException(
        friendly ?? `${context} respondió ${response.status}: ${body}`,
      );
    }
    throw new InternalServerErrorException(
      friendly ?? `${context} respondió ${response.status}: ${body}`,
    );
  }

  private describeYouCamError(body: string): string | null {
    try {
      const parsed = JSON.parse(body) as {
        error?: string;
        error_code?: string;
      };
      if (parsed.error_code === 'CreditInsufficiency') {
        return 'El proveedor YouCam no tiene créditos disponibles en este momento — contacta al administrador para recargar la cuenta.';
      }
      if (parsed.error) {
        return `YouCam rechazó la solicitud: ${parsed.error}`;
      }
    } catch {
      // El cuerpo no es JSON — se usa el mensaje genérico con el texto crudo.
    }
    return null;
  }
}
