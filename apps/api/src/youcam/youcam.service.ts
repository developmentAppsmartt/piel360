import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ANALISIS_PIEL360_DST_ACTIONS } from '@piel360/shared';
import type { AnalisisPiel360Results } from '@piel360/shared';
import {
  fetchAnalisisPiel360CreditHistory,
  type AnalisisPiel360CreditHistoryItem,
} from './youcam-credit-history';

export type { AnalisisPiel360CreditHistoryItem };

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
    results?: AnalisisPiel360Results;
    error?: unknown;
    // Descripción detallada del error (V2.1.MD) — `error` es solo el código
    // (ej. "error_no_face"), este campo trae el mensaje legible.
    error_message?: string;
    [key: string]: unknown;
  };
}

export type AnalisisPiel360CheckStatusResult =
  | { status: 'success'; results: AnalisisPiel360Results }
  | { status: 'processing' }
  | { status: 'error'; message: string };

export type AnalisisPiel360CreditBalance = {
  id: string;
  type: 'ApiSubsToken' | 'ApiPaygToken' | string;
  amount: number;
  expiryMs: number | null;
};

export type AnalisisPiel360FeatureSku = {
  description: string;
  amount: number;
  unit: string;
  procUnit: number;
  runTaskUrl: string;
};

/**
 * Cliente HTTP puro de la API server-to-server de YouCam (INTEGRACIONES-IA.md
 * §2). `Authorization: Bearer ${YOUCAM_API_KEY}` — confirmado literal en
 * `AnalisisPiel360Service.php` vía `Http::withToken($apiKey)`.
 *
 * También consulta saldo/costos Perfect Corp (`/s2s/v1.0/client/credit`,
 * `/s2s/v2.0/credit/feature-cost`) — misma cuenta para YouCam + Fitzpatrick.
 */
@Injectable()
export class AnalisisPiel360Service {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('YOUCAM_API_URL');
    this.apiKey = this.config.getOrThrow<string>('YOUCAM_API_KEY');
  }

  /** `GET /s2s/v1.0/client/credit` — saldo de unidades Perfect Corp. */
  async getCreditBalances(): Promise<AnalisisPiel360CreditBalance[]> {
    const response = await fetch(`${this.baseUrl}/s2s/v1.0/client/credit`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      await this.throwAnalisisPiel360Error(response, 'PerfectCorp client/credit');
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
  async getFeatureCosts(maxPages = 10): Promise<AnalisisPiel360FeatureSku[]> {
    const skus: AnalisisPiel360FeatureSku[] = [];
    let startingToken: string | null = null;

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${this.baseUrl}/s2s/v2.0/credit/feature-cost`);
      url.searchParams.set('page_size', '20');
      if (startingToken) url.searchParams.set('starting_token', startingToken);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) {
        await this.throwAnalisisPiel360Error(response, 'PerfectCorp credit/feature-cost');
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

  /** `GET /s2s/v1.0/client/credit/history` — historial de unidades, varias páginas. */
  getCreditHistory(): Promise<AnalisisPiel360CreditHistoryItem[]> {
    return fetchAnalisisPiel360CreditHistory({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      onError: (response) =>
        this.throwAnalisisPiel360Error(
          response,
          'PerfectCorp client/credit/history',
        ),
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
        `No se pudo contactar el servicio de análisis estético (file/skin-analysis): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!declareResponse.ok) {
      await this.throwAnalisisPiel360Error(declareResponse, 'análisis estético file/skin-analysis');
    }

    const json = (await declareResponse.json()) as UploadUrlResponse;
    const uploadData = json.data?.files?.[0];
    const fileId = uploadData?.file_id;
    const uploadUrl = uploadData?.requests?.[0]?.url;
    if (!fileId || !uploadUrl) {
      throw new InternalServerErrorException(
        'El servicio de análisis estético no devolvió file_id o la URL de subida',
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
        `No se pudo subir la imagen al almacenamiento del análisis estético: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!uploadResponse.ok) {
      const body = await uploadResponse.text();
      throw new InternalServerErrorException(
        `Fallo al subir la imagen binaria del análisis estético (${uploadResponse.status}): ${body}`,
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
          dst_actions: ANALISIS_PIEL360_DST_ACTIONS,
          miniserver_args: { enable_mask_overlay: enableMaskOverlay },
          format: 'json',
          pf_camera_kit: true,
        }),
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `No se pudo contactar el servicio de análisis estético (task/skin-analysis): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!response.ok) {
      await this.throwAnalisisPiel360Error(response, 'análisis estético task/skin-analysis');
    }

    const json = (await response.json()) as StartAnalysisResponse;
    const taskId = json.data?.task_id;
    if (!taskId) {
      throw new InternalServerErrorException(
        'El análisis estético no devolvió task_id al iniciar',
      );
    }
    return taskId;
  }

  /** No lanza en `task_status: 'error'` — YouCam puede rechazar la tarea de
   * forma permanente (ej. "Input image resolution is too small.") y no tiene
   * sentido reintentar; se devuelve como dato para que el caller decida
   * (`AnalisisPiel360PollProcessor`/`AnalisisPiel360WebhookService` marcan el análisis como
   * fallido en vez de reintentar 20 veces con backoff exponencial contra
   * una condición que nunca va a cambiar). */
  async checkStatus(taskId: string): Promise<AnalisisPiel360CheckStatusResult> {
    const response = await fetch(
      `${this.baseUrl}/s2s/v2.1/task/skin-analysis/${taskId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    if (!response.ok) {
      await this.throwAnalisisPiel360Error(response, 'YouCam checkStatus');
    }

    const json = (await response.json()) as CheckStatusResponse;
    const status = json.data.task_status ?? 'processing';

    if (status === 'success') {
      return {
        status: 'success',
        results: (json.data.results ?? json.data) as AnalisisPiel360Results,
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
  private async throwAnalisisPiel360Error(
    response: Response,
    context: string,
  ): Promise<never> {
    const body = await response.text();
    const friendly = this.describeAnalisisPiel360Error(body);

    if (response.status >= 400 && response.status < 500) {
      throw new BadRequestException(
        friendly ?? `${context} respondió ${response.status}: ${body}`,
      );
    }
    throw new InternalServerErrorException(
      friendly ?? `${context} respondió ${response.status}: ${body}`,
    );
  }

  private describeAnalisisPiel360Error(body: string): string | null {
    try {
      const parsed = JSON.parse(body) as {
        error?: string;
        error_code?: string;
      };
      if (parsed.error_code === 'CreditInsufficiency') {
        return 'Suscripción no disponible. Análisis Estético Piel 360 — contacta al administrador para recargar la cuenta.';
      }
      if (parsed.error) {
        return `El análisis estético rechazó la solicitud: ${parsed.error}`;
      }
    } catch {
      // El cuerpo no es JSON — se usa el mensaje genérico con el texto crudo.
    }
    return null;
  }
}
