import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  parseAnalisisDermaPiel360Description,
  analisisDermaPiel360CategoryLabel,
  analisisDermaPiel360DiagnosisLabel,
  type AnalisisDermaPiel360CandidateDetails,
  type AnalisisDermaPiel360DiagnosisDetails,
  type AnalisisDermaPiel360Prediction,
  type AnalisisDermaPiel360RiskGuidance,
  type AnalisisPiel360Results,
  toPublicProviderSlug,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { buildImagePreview, previewKeyFor } from './image-preview.util';
import { analisisPiel360MaskKey } from '../youcam/mask-key.util';

/** Extraído de AnalysesService — lo reutiliza también PatientsService
 * (historial 3D) para no duplicar el firmado de URLs ni la lógica de
 * fallback. Las columnas *S3Url/imagePath solo guardan la key del bucket
 * propio; esto agrega URLs firmadas navegables sin tocar los campos crudos.
 * Para análisis YouCam (analisisPiel360TaskId presente) también arma `masks` — a
 * diferencia de Skiniver, YouCam no usa coloredS3Url/maskedS3Url sino una
 * máscara por métrica en `analyses/{id}/masks/{type}` (sin extensión en la
 * key, ver youcam-results.service.ts). */
@Injectable()
export class AnalysisImageUrlsService {
  private readonly logger = new Logger(AnalysisImageUrlsService.name);

  private readonly previewsInFlight = new Set<string>();

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async withImageUrls<
    T extends {
      imagePath: string;
      imagePreviewPath?: string | null;
      coloredS3Url: string | null;
      maskedS3Url: string | null;
      analisisPiel360TaskId: string | null;
      aiRawResponse: Prisma.JsonValue | null;
      aiProbability: number | null;
      id: bigint;
    },
  >(analysis: T) {
    // Fallback temporal (mismo criterio que signAnalisisPiel360Masks): si nuestra copia
    // propia aún no existe o no se puede firmar (sin credenciales S3 reales),
    // usar directamente la URL que ya da Skiniver — a diferencia de YouCam no
    // trae expiración por query string, así que sirve como respaldo estable
    // mientras no haya bucket propio configurado.
    const prediction =
      !analysis.analisisPiel360TaskId && analysis.aiRawResponse
        ? (analysis.aiRawResponse as unknown as AnalisisDermaPiel360Prediction)
        : null;

    const [imageUrl, signedColoredUrl, signedMaskedUrl, masks] =
      await Promise.all([
        this.signIfPresent(analysis.imagePreviewPath ?? analysis.imagePath),
        this.signIfPresent(analysis.coloredS3Url),
        this.signIfPresent(analysis.maskedS3Url),
        this.signAnalisisPiel360Masks(analysis),
      ]);
    // Sin respaldo a la URL del proveedor: su dominio lleva el nombre y no
    // puede llegar al navegador. Mientras el job no baje nuestra copia la
    // imagen va nula, que es un caso que el front ya pinta.
    const coloredUrl = signedColoredUrl;
    const maskedUrl = signedMaskedUrl;
    // Para YouCam, `imagePath` solo es una key real cuando se guardó la selfie
    // aparte (enableMaskOverlay: false, ver youcam-analyses.service.ts) — con
    // el placeholder 'youcam' de siempre, imageUrl es un link muerto que el
    // frontend no debe intentar mostrar.
    const hasOriginalPhoto = analysis.imagePath !== 'youcam';
    if (
      analysis.analisisPiel360TaskId &&
      hasOriginalPhoto &&
      !analysis.imagePreviewPath
    ) {
      void this.createPreview(analysis.id, analysis.imagePath);
    }
    const analisisDermaPiel360Diagnosis = prediction
      ? this.buildAnalisisDermaPiel360Diagnosis(prediction, analysis.aiProbability)
      : null;
    return {
      ...analysis,
      imagePath: imagePathPublico(analysis.imagePath),
      aiRawResponse: sinUrlsDelProveedor(analysis.aiRawResponse),
      imageUrl,
      coloredUrl,
      maskedUrl,
      masks,
      hasOriginalPhoto,
      analisisDermaPiel360Diagnosis,
    };
  }

  /** Skiniver no manda diagnóstico/tratamiento/consejo/ICD como claves
   * separadas — vienen concatenados como texto libre en `description`, y el
   * "ICD" real se llama `lesion_code`. Ver `parseAnalisisDermaPiel360Description`. */
  private buildAnalisisDermaPiel360Diagnosis(
    prediction: AnalisisDermaPiel360Prediction,
    aiProbability: number | null,
  ): AnalisisDermaPiel360DiagnosisDetails {
    const parsed = parseAnalisisDermaPiel360Description(prediction.description);
    return {
      description: parsed?.riskEvaluation ?? null,
      conclusion: {
        // Este campo es derivado (categoría o, si falta, el diagnóstico), así
        // que se traduce acá y no en cada vista: Skiniver no traduce `desease`
        // ni `class`, y de aquí comen web, mobile y el PDF del reporte.
        category:
          analisisDermaPiel360CategoryLabel(prediction.desease) ||
          analisisDermaPiel360DiagnosisLabel(prediction.class) ||
          null,
        category_prob: Math.round((aiProbability ?? 0) * 100),
      },
      precise_diagnosis: parsed?.preciseDiagnosis ?? null,
      treatment: parsed?.treatment ?? null,
      advice: parsed?.advice ?? null,
      icd_code: prediction.lesion_code ?? null,
      candidates: this.buildAnalisisDermaPiel360Candidates(prediction),
      risk: this.buildAnalisisDermaPiel360RiskGuidance(prediction),
    };
  }

  /** Un descriptivo por `topn[]`. Cada candidato trae su propio `description`
   * completo, así que se parsea el suyo y nunca se hereda el del principal:
   * antes se descartaba por heurística y los diagnósticos de apoyo salían sin
   * texto, aunque el JSON sí lo traía. */
  private buildAnalisisDermaPiel360Candidates(
    prediction: AnalisisDermaPiel360Prediction,
  ): AnalisisDermaPiel360CandidateDetails[] {
    const topn = Array.isArray(prediction.topn) ? prediction.topn : [];
    const rootClass = prediction.class?.trim().toLowerCase();

    return topn.flatMap((item) => {
      const className = item?.class?.trim();
      if (!className) return [];
      const parsed = parseAnalisisDermaPiel360Description(item.description);
      const prob = Number(item.prob);
      const safeProb = Number.isFinite(prob) ? prob : 0;
      return [
        {
          class: className,
          class_raw: item.class_raw ?? null,
          label: analisisDermaPiel360DiagnosisLabel(className, item.class_raw),
          // Skiniver manda 0–1 en `topn[]`; el resto del sistema usa 0–100.
          prob:
            Math.round((safeProb <= 1 ? safeProb * 100 : safeProb) * 10) / 10,
          category: analisisDermaPiel360CategoryLabel(item.desease) || null,
          risk_level: item.risk_level ?? null,
          // El ICD de la raíz solo vale para el candidato que ES la raíz.
          icd_code:
            item.lesion_code ??
            (className.toLowerCase() === rootClass
              ? (prediction.lesion_code ?? null)
              : null),
          atlas_page_link: item.atlas_page_link ?? null,
          description: parsed?.riskEvaluation || null,
          precise_diagnosis: parsed?.preciseDiagnosis || null,
          treatment: parsed?.treatment || null,
          advice: parsed?.advice || null,
        },
      ];
    });
  }

  /** Textos que Skiniver manda como claves propias, fuera de `description`. */
  private buildAnalisisDermaPiel360RiskGuidance(
    prediction: AnalisisDermaPiel360Prediction,
  ): AnalisisDermaPiel360RiskGuidance {
    const raw = prediction as unknown as Record<string, unknown>;
    const text = (key: string): string | null => {
      const value = raw[key];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };
    return {
      title: text('risk_title'),
      level_title: text('risk_level_title'),
      description: text('risk_description'),
      suggestion: text('risk_suggestion'),
      short_recommendation: text('short_recommendation'),
    };
  }

  private async signAnalisisPiel360Masks(analysis: {
    analisisPiel360TaskId: string | null;
    aiRawResponse: Prisma.JsonValue | null;
    id: bigint;
  }): Promise<{ type: string; region?: string; url: string }[]> {
    if (!analysis.analisisPiel360TaskId || !analysis.aiRawResponse) return [];

    const results = analysis.aiRawResponse as unknown as AnalisisPiel360Results;
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
          const key = `analyses/${analysis.id}/masks/${analisisPiel360MaskKey(item)}`;
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

  /** Análisis anteriores a la versión liviana: se genera en segundo plano la primera vez. */
  private async createPreview(id: bigint, imagePath: string): Promise<void> {
    const key = id.toString();
    if (this.previewsInFlight.has(key)) return;
    this.previewsInFlight.add(key);
    try {
      const original = await this.storage.downloadToBuffer(
        await this.storage.getSignedUrl(imagePath),
      );
      const previewKey = previewKeyFor(imagePath);
      await this.storage.upload(
        previewKey,
        await buildImagePreview(original),
        'image/jpeg',
      );
      await this.prisma.analysis.update({
        where: { id },
        data: { imagePreviewPath: previewKey },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la vista liviana del análisis ${key}: ${String(error)}`,
      );
    } finally {
      this.previewsInFlight.delete(key);
    }
  }

  private async signIfPresent(key: string | null): Promise<string | null> {
    if (!key) return null;
    if (key === 'youcam') return null;
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

/**
 * Quita de la respuesta cruda del proveedor cualquier valor que lleve su
 * nombre. Hoy son cuatro URLs de su CDN —`s3_url`, `image_url`,
 * `colored_s3_url`, `masked_s3_url`— y el front no las usa: pinta
 * `coloredUrl`/`maskedUrl`, que firman nuestra propia copia.
 *
 * La regla va por VALOR y no por una lista de claves a propósito: el día que
 * el proveedor añada otro campo con su dominio, esto lo tapa solo. La fila en
 * la base no se toca, porque el job de descarga necesita esas URLs.
 */
const NOMBRE_DEL_PROVEEDOR = /youcam|skiniver|perfect/i;

/**
 * `imagePath` guarda el centinela `'youcam'` cuando no se guardó la selfie
 * original (ver `youcam-analyses.service.ts`). Es una marca interna sin
 * significado para el cliente —que mira `hasOriginalPhoto`— pero viaja en la
 * respuesta, así que sale con el slug público.
 */
export function imagePathPublico(imagePath: string): string {
  return toPublicProviderSlug(imagePath);
}

export function sinUrlsDelProveedor(
  raw: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  if (typeof raw === 'string') {
    return NOMBRE_DEL_PROVEEDOR.test(raw) ? null : raw;
  }
  if (raw === null || typeof raw !== 'object') return raw;
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      sinUrlsDelProveedor(item as Prisma.JsonValue),
    ) as Prisma.JsonValue;
  }
  const salida: Record<string, Prisma.JsonValue> = {};
  for (const [clave, valor] of Object.entries(
    raw as Record<string, Prisma.JsonValue>,
  )) {
    if (typeof valor === 'string' && NOMBRE_DEL_PROVEEDOR.test(valor)) continue;
    salida[clave] = sinUrlsDelProveedor(valor);
  }
  return salida as Prisma.JsonValue;
}
