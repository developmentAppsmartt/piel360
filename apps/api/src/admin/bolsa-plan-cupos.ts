import { PrismaService } from '../prisma/prisma.service';
import { bagCreditsForPlan } from '../subscriptions/bag-credits';

export type BolsaPlanCupo = {
  id: string;
  planName: string;
  holderName: string;
  holderEmail: string | null;
  /** Análisis que vende el plan. */
  analyses: number;
  /** Créditos apartados en la bolsa (estético × 22, fototipo × 10, derm × 1). */
  credits: number;
  /** Análisis ya corridos con ese cupo. */
  used: number;
  /** Créditos que siguen reservados. */
  remaining: number;
  assignedAt: string;
};

/** Cada suscripción aparta créditos de la bolsa. El cupo se expresa en
 * créditos del proveedor, no en la cantidad de análisis del plan. */
export async function listBolsaPlanCupos(
  prisma: PrismaService,
  poolProvider: 'skiniver' | 'perfectcorp',
): Promise<BolsaPlanCupo[]> {
  const [rows, providers] = await Promise.all([
    prisma.subscriptionPoolAllocation.findMany({
      where: { poolProvider },
      orderBy: { updatedAt: 'desc' },
      include: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                analysisLimit: true,
                analysisLimits: true,
                analysisProviderIds: true,
                analysisProviderId: true,
              },
            },
            user: { select: { firstName: true, lastName: true, email: true } },
            usages: { select: { quantity: true } },
          },
        },
      },
    }),
    prisma.analysisProvider.findMany({ select: { id: true, slug: true } }),
  ]);
  const slugById = new Map(
    providers.map((provider) => [provider.id.toString(), provider.slug]),
  );

  return rows
    .map((row) => {
      const user = row.subscription.user;
      const plan = row.subscription.plan;
      const holderName =
        `${user.firstName} ${user.lastName}`.trim() || user.email;
      const used = row.subscription.usages.reduce(
        (sum, usage) => sum + usage.quantity,
        0,
      );
      const analyses = Math.max(0, plan.analysisLimit);
      const fullCredits = bagCreditsForPlan(plan, slugById);
      const netStored = Math.max(0, row.allocated - row.returned);
      // Filas viejas guardan análisis (20) donde la bolsa guarda créditos (440).
      const legacy =
        fullCredits > analyses &&
        analyses > 0 &&
        row.allocated > 0 &&
        row.allocated <= analyses;
      const reserved = legacy
        ? Math.round(netStored * (fullCredits / analyses))
        : netStored;
      const perAnalysis = analyses > 0 ? fullCredits / analyses : 1;
      const unusedAnalyses = Math.max(0, analyses - used);
      const remaining = Math.round(
        Math.min(unusedAnalyses * perAnalysis, reserved),
      );
      return {
        id: row.subscriptionId.toString(),
        planName: plan.name,
        holderName,
        holderEmail: user.email,
        analyses,
        credits: reserved,
        used,
        remaining,
        assignedAt: row.subscription.createdAt.toISOString(),
      };
    })
    .filter((row) => row.credits > 0);
}
