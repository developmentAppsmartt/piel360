import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { normalizeYoucamResults, readOutput } from '../src/youcam/youcam-normalize.util';

// Prisma 7: el cliente necesita un driver adapter explícito (ver src/prisma/prisma.service.ts).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const YOUCAM_PROVIDER_SLUG = 'youcam';

async function backfillAnalysis(analysisId: bigint, providerId: bigint | null) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: { id: true, aiRawResponse: true },
  });

  if (!analysis) {
    console.log(`  ! Análisis ${analysisId} no existe — omitido`);
    return { results: 0, masks: 0 };
  }

  if (readOutput(analysis.aiRawResponse).length === 0) {
    console.log(`  ! Análisis ${analysisId} sin output[] — omitido`);
    return { results: 0, masks: 0 };
  }

  return prisma.$transaction(
    async (tx) => {
      if (providerId !== null) {
        await tx.analysis.update({
          where: { id: analysisId },
          data: { providerId },
        });
      }

      const counts = await normalizeYoucamResults(
        tx,
        analysisId,
        providerId,
        analysis.aiRawResponse,
      );

      console.log(
        `  ✓ Análisis ${analysisId}: ${counts.results} resultados, ${counts.masks} máscaras`,
      );
      return counts;
    },
    // ~30 métricas × (resultado + máscara) supera el timeout por defecto de 5s.
    { timeout: 30_000 },
  );
}

async function main() {
  const provider = await prisma.analysisProvider.findUnique({
    where: { slug: YOUCAM_PROVIDER_SLUG },
    select: { id: true },
  });
  if (!provider) {
    console.warn(
      `Proveedor "${YOUCAM_PROVIDER_SLUG}" no encontrado — se deja provider_id en NULL (corre el seed primero).`,
    );
  }
  const providerId = provider?.id ?? null;

  const args = process.argv.slice(2).filter((arg) => /^\d+$/.test(arg));

  const ids =
    args.length > 0
      ? args.map((arg) => BigInt(arg))
      : (
          await prisma.analysis.findMany({
            where: { youcamTaskId: { not: null }, isValid: true },
            select: { id: true },
            orderBy: { id: 'asc' },
          })
        ).map((row) => row.id);

  if (ids.length === 0) {
    console.log('No hay análisis YouCam para normalizar.');
    return;
  }

  console.log(`Normalizando ${ids.length} análisis...`);

  let totalResults = 0;
  let totalMasks = 0;
  for (const id of ids) {
    const { results, masks } = await backfillAnalysis(id, providerId);
    totalResults += results;
    totalMasks += masks;
  }

  console.log(
    `Listo: ${totalResults} filas en analysis_results, ${totalMasks} en analysis_masks.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
