import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  SkiniverAtlasResponse,
  SkiniverPrediction,
  SkiniverValidateResponse,
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

  async validate(image: Buffer): Promise<SkiniverValidateResponse> {
    return this.postImage<SkiniverValidateResponse>('/validate', image);
  }

  async predict(image: Buffer, lang: string): Promise<SkiniverPrediction> {
    return this.postImage<SkiniverPrediction>('/predict', image, { lang });
  }

  async getAtlasPages(): Promise<SkiniverAtlasResponse> {
    const response = await fetch(`${this.baseUrl}/get_atlas_pages`, {
      headers: { Authorization: `Basic ${this.token}` },
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Skiniver /get_atlas_pages respondió ${response.status}`,
      );
    }
    return response.json() as Promise<SkiniverAtlasResponse>;
  }

  private async postImage<T>(
    path: string,
    image: Buffer,
    fields: Record<string, string> = {},
  ): Promise<T> {
    const form = new FormData();
    form.append('img', new Blob([new Uint8Array(image)]), 'photo.jpg');
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${this.token}` },
      body: form,
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Skiniver ${path} respondió ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
