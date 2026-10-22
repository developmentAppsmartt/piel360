import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AnalisisDermaPiel360AtlasResponse,
  AnalisisDermaPiel360Prediction,
  AnalisisDermaPiel360ValidateResponse,
} from '@piel360/shared';

/**
 * Cliente de `api.skiniver.com` (INTEGRACIONES-IA.md §1). Síncrono: la
 * respuesta llega en el mismo request HTTP (a diferencia de YouCam).
 * El token vive en `SKINIVER_API_TOKEN` (env) — en Laravel estaba
 * hardcodeado en el código (MIGRACION.md deuda #1).
 */
@Injectable()
export class SkiniverService {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('SKINIVER_API_URL');
    this.token = this.config.getOrThrow<string>('SKINIVER_API_TOKEN');
  }

  async validate(image: Buffer): Promise<AnalisisDermaPiel360ValidateResponse> {
    return this.postImage<AnalisisDermaPiel360ValidateResponse>('/validate', image);
  }

  async predict(image: Buffer, lang: string): Promise<AnalisisDermaPiel360Prediction> {
    return this.postImage<AnalisisDermaPiel360Prediction>('/predict', image, { lang });
  }

  async getAtlasPages(): Promise<AnalisisDermaPiel360AtlasResponse> {
    const response = await fetch(`${this.baseUrl}/get_atlas_pages`, {
      headers: { Authorization: `Basic ${this.token}` },
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Skiniver /get_atlas_pages respondió ${response.status}`,
      );
    }
    return response.json() as Promise<AnalisisDermaPiel360AtlasResponse>;
  }

  private async postImage<T>(
    path: string,
    image: Buffer,
    fields: Record<string, string> = {},
  ): Promise<T> {
    if (!image?.length) {
      throw new InternalServerErrorException(
        'No se recibió imagen para enviar a Skiniver',
      );
    }

    const form = new FormData();
    form.append('img', new Blob([new Uint8Array(image)]), 'photo.jpg');
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${this.token}` },
        body: form,
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `No se pudo contactar Skiniver ${path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const raw = await response.text();
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Skiniver ${path} respondió ${response.status}: ${raw.slice(0, 300)}`,
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new InternalServerErrorException(
        `Skiniver ${path} devolvió JSON inválido: ${raw.slice(0, 200)}`,
      );
    }
  }
}
