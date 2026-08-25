import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SkiniverPrediction, YouCamResults } from '@piel360/shared';
import { StorageService } from '../storage/storage.service';
import { youcamMaskKey } from '../youcam/mask-key.util';

/** Extraído de AnalysesService — lo reutiliza también PatientsService
 * (historial 3D) para no duplicar el firmado de URLs ni la lógica de
 * fallback. Las columnas *S3Url/imagePath solo guardan la key del bucket
 * propio; esto agrega URLs firmadas navegables sin tocar los campos crudos.
 * Para análisis YouCam (youcamTaskId presente) también arma `masks` — a
 * diferencia de Skiniver, YouCam no usa coloredS3Url/maskedS3Url sino una
 * máscara por métrica en `analyses/{id}/masks/{type}` (sin extensión en la
 * key, ver youcam-results.service.ts). */
@Injectable()
export class AnalysisImageUrlsService {
  private readonly logger = new Logger(AnalysisImageUrlsService.name);

  constructor(private readonly storage: StorageService) {}

  async withImageUrls<
    T extends {
      imagePath: string;
      coloredS3Url: string | null;
      maskedS3Url: string | null;
      youcamTaskId: string | null;
      aiRawResponse: Prisma.JsonValue | null;
      id: bigint;
    },
  >(analysis: T) {
    // Fallback temporal (mismo criterio que signYoucamMasks): si nuestra copia
    // propia aún no existe o no se puede firmar (sin credenciales S3 reales),
    // usar directamente la URL que ya da Skiniver — a diferencia de YouCam no
    // trae expiración por query string, así que sirve como respaldo estable
    // mientras no haya bucket propio configurado.
    const prediction =
      !analysis.youcamTaskId && analysis.aiRawResponse
        ? (analysis.aiRawResponse as unknown as SkiniverPrediction)
        : null;

    const [imageUrl, signedColoredUrl, signedMaskedUrl, masks] =
      await Promise.all([
        this.signIfPresent(analysis.imagePath),
        this.signIfPresent(analysis.coloredS3Url),
        this.signIfPresent(analysis.maskedS3Url),
        this.signYoucamMasks(analysis),
      ]);
    const coloredUrl = signedColoredUrl ?? prediction?.colored_s3_url ?? null;
    const maskedUrl = signedMaskedUrl ?? prediction?.masked_s3_url ?? null;
    // Para YouCam, `imagePath` solo es una key real cuando se guardó la selfie
    // aparte (enableMaskOverlay: false, ver youcam-analyses.service.ts) — con
    // el placeholder 'youcam' de siempre, imageUrl es un link muerto que el
    // frontend no debe intentar mostrar.
    const hasOriginalPhoto = analysis.imagePath !== 'youcam';
    return {
      ...analysis,
      imageUrl,
      coloredUrl,
      maskedUrl,
      masks,
      hasOriginalPhoto,
    };
  }

  private async signYoucamMasks(analysis: {
    youcamTaskId: string | null;
    aiRawResponse: Prisma.JsonValue | null;
    id: bigint;
  }): Promise<{ type: string; region?: string; url: string }[]> {
    if (!analysis.youcamTaskId || !analysis.aiRawResponse) return [];

    const results = analysis.aiRawResponse as unknown as YouCamResults;
    // Incluir TODOS los output items (no solo los que traen mask_urls).
    // Poros/arrugas por zona (forehead/nose/cheek/…) suelen estar en S3
    // aunque mask_urls haya expirado o venga vacío — sin esto "General"
    // solo recibía la máscara whole/mejillas.
    const items = results.output ?? [];

    const signed = await Promise.all(
      items.map(
        async (
          item,
        ): Promise<{ type: string; region?: string; url: string } | null> => {
          if (!item?.type) return null;
          const key = `analyses/${analysis.id}/masks/${youcamMaskKey(item)}`;
          const signedUrl = await this.signIfPresent(key);
          const fallback = item.mask_urls?.[0] ?? null;
          const url = signedUrl ?? fallback ?? null;
          return url ? { type: item.type, region: item.region, url } : null;
        },
      ),
    );
    return signed.filter(
      (m): m is { type: string; region?: string; url: string } => m !== null,
    );
  }

  private async signIfPresent(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key);
    } catch (error) {
      // getSignedUrl puede fallar sin red (ej. falta S3_REGION) — no debe
      // tumbar toda la respuesta del análisis por esto.
      this.logger.warn(`No se pudo firmar la URL de ${key}: ${String(error)}`);
      return null;
    }
  }
}
