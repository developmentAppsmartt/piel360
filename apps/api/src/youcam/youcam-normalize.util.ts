import type { Prisma } from '@prisma/client';

interface RawOutputItem {
  type?: unknown;
  region?: unknown;
  ui_score?: unknown;
  raw_score?: unknown;
  score?: unknown;
  mask_urls?: unknown;
}

export function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Misma convención que `youcamMaskKey` en src/youcam/mask-key.util.ts: sin la
 * región, las distintas zonas de `hd_pore`/`hd_wrinkle`/`hd_skin_type`
 * comparten ruta y se pisan entre sí.
 */
export function maskKey(type: string, region: string | null): string {
  return region ? `${type}_${region}` : type;
}

export function readOutput(rawResponse: unknown): RawOutputItem[] {
  if (!rawResponse || typeof rawResponse !== 'object') return [];
  const output = (rawResponse as { output?: unknown }).output;
  return Array.isArray(output) ? (output as RawOutputItem[]) : [];
}

/**
 * Vuelca `aiRawResponse.output[]` a `analysis_results` + `analysis_masks`.
 * Idempotente: borra los resultados previos del análisis (las máscaras caen
 * por ON DELETE CASCADE) y reinserta desde el JSON, que sigue siendo la
 * fuente de verdad.
 */
export async function normalizeYoucamResults(
  tx: Prisma.TransactionClient,
  analysisId: bigint,
  providerId: bigint | null,
  rawResponse: unknown,
): Promise<{ results: number; masks: number }> {
  await tx.analysisResult.deleteMany({ where: { analysisId } });

  let results = 0;
  let masks = 0;

  for (const item of readOutput(rawResponse)) {
    const type = toStringOrNull(item.type);
    if (!type) continue;

    const region = toStringOrNull(item.region);

    const result = await tx.analysisResult.create({
      data: {
        analysisId,
        providerId,
        type,
        region,
        uiScore: toNumberOrNull(item.ui_score),
        rawScore: toNumberOrNull(item.raw_score),
        score: toNumberOrNull(item.score),
      },
    });
    results += 1;

    const maskUrls = Array.isArray(item.mask_urls) ? item.mask_urls : [];
    for (const url of maskUrls) {
      if (typeof url !== 'string' || url.length === 0) continue;
      await tx.analysisMask.create({
        data: {
          analysisResultId: result.id,
          objectKey: `analyses/${analysisId}/masks/${maskKey(type, region)}`,
          url,
        },
      });
      masks += 1;
    }
  }

  return { results, masks };
}
