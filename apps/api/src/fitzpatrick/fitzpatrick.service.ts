import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FitzpatrickResult } from '@piel360/shared';

interface UploadUrlResponse {
  data: {
    files: Array<{ file_id: string; requests: Array<{ url: string }> }>;
  };
}

interface StartTaskResponse {
  data: { task_id: string };
}

interface CheckStatusResponse {
  status: number;
  data: {
    task_status: 'running' | 'success' | 'error';
    error: string | null;
    error_message: string;
    results?: FitzpatrickResult;
  };
}

export type FitzpatrickCheckStatusResult =
  | { status: 'success'; result: FitzpatrickResult }
  | { status: 'processing' }
  | { status: 'error'; message: string };

/**
 * Cliente HTTP puro de la API "AI Fitzpatrick Skin Type Analysis" de
 * PerfectCorp (docs/ai_fitzpatrick_skin_type.md) — API separada de la de
 * YouCam Skin Analysis (`/s2s/v2.0/...` en vez de `/s2s/v2.1/...`), mismo
 * servidor/cuenta, mismo esquema de auth Bearer. Mismo patrón de 2 pasos
 * para subir imagen que `YouCamService#uploadImage`.
 */
@Injectable()
export class FitzpatrickService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('YOUCAM_API_URL');
    this.apiKey = this.config.getOrThrow<string>('YOUCAM_API_KEY');
  }

  async uploadImage(image: Buffer): Promise<string> {
    const declareResponse = await fetch(`${this.baseUrl}/s2s/v2.0/file`, {
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
    });
    if (!declareResponse.ok) {
      await this.throwError(declareResponse, 'Fitzpatrick file');
    }

    const json = (await declareResponse.json()) as UploadUrlResponse;
    const uploadData = json.data.files[0];
    const fileId = uploadData?.file_id;
    const uploadUrl = uploadData?.requests[0]?.url;
    if (!fileId || !uploadUrl) {
      throw new InternalServerErrorException(
        'El JSON de Fitzpatrick no contiene file_id o la URL de subida',
      );
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: new Uint8Array(image),
    });
    if (!uploadResponse.ok) {
      const body = await uploadResponse.text();
      throw new InternalServerErrorException(
        `Fallo al subir la imagen binaria al S3 de Fitzpatrick (${uploadResponse.status}): ${body}`,
      );
    }

    return fileId;
  }

  async startTask(fileId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/s2s/v2.0/task/fitzpatrick-scale-analyzer`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        // `version` es obligatorio y no está documentado en
        // docs/ai_fitzpatrick_skin_type.md — confirmado en vivo (400
        // InvalidParameters: "version is required") y por el propio mensaje
        // de error de PerfectCorp, que indica "1.0".
        body: JSON.stringify({ src_file_id: fileId, version: '1.0' }),
      },
    );
    if (!response.ok) {
      await this.throwError(
        response,
        'Fitzpatrick task/fitzpatrick-scale-analyzer',
      );
    }

    const json = (await response.json()) as StartTaskResponse;
    return json.data.task_id;
  }

  async checkStatus(taskId: string): Promise<FitzpatrickCheckStatusResult> {
    const response = await fetch(
      `${this.baseUrl}/s2s/v2.0/task/fitzpatrick-scale-analyzer/${taskId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    if (!response.ok) {
      await this.throwError(response, 'Fitzpatrick checkStatus');
    }

    const json = (await response.json()) as CheckStatusResponse;
    if (json.data.task_status === 'success' && json.data.results) {
      return { status: 'success', result: json.data.results };
    }
    if (json.data.task_status === 'error') {
      return {
        status: 'error',
        message:
          json.data.error_message || json.data.error || 'Error desconocido',
      };
    }
    return { status: 'processing' };
  }

  private async throwError(
    response: Response,
    context: string,
  ): Promise<never> {
    const body = await response.text();
    if (response.status >= 400 && response.status < 500) {
      throw new BadRequestException(
        `${context} respondió ${response.status}: ${body}`,
      );
    }
    throw new InternalServerErrorException(
      `${context} respondió ${response.status}: ${body}`,
    );
  }
}
