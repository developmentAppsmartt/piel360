import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { bagCreditsForPlan } from './bag-credits';

type Db = PrismaService | Prisma.TransactionClient;

const SKINIVER = 'skiniver';

function subscriptionIdFromNote(note: string | null): string | null {
  const match = note?.match(/suscripción #(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Créditos dermatológicos que ya no están en un plan y no deben volver a
 * la bolsa: análisis cuyo uso se borró con el plan, o la reserva del
 * libro que quedó al eliminar la suscripción.
 */
export async function dermCreditsSpentOutsidePlans(db: Db): Promise<number> {
  const [orphans, movements, liveSubs] = await Promise.all([
    db.analysis.count({
      where: {
        usage: { is: null },
        provider: { slug: SKINIVER },
      },
    }),
    db.platformUnitRecharge.findMany({
      where: {
        provider: SKINIVER,
        kind: { in: ['subscription_reserve', 'subscription_return'] },
      },
      select: { quantity: true, note: true },
    }),
    db.subscription.findMany({ select: { id: true } }),
  ]);

  const live = new Set(liveSubs.map((row) => row.id.toString()));
  const netBySub = new Map<string, number>();
  for (const row of movements) {
    const id = subscriptionIdFromNote(row.note);
    if (!id || live.has(id)) continue;
    netBySub.set(id, (netBySub.get(id) ?? 0) + row.quantity);
  }

  let ledgerOut = 0;
  for (const net of netBySub.values()) {
    if (net < 0) ledgerOut += -net;
  }

  const writeoffs = await db.platformUnitRecharge.aggregate({
    where: { provider: SKINIVER, kind: 'balance_writeoff' },
    _sum: { quantity: true },
  });

  return (writeoffs._sum.quantity ?? 0) + Math.max(orphans, ledgerOut);
}

/**
 * Al borrar un plan, la suscripción y su cupo desaparecen. Sin este
 * ajuste, los créditos ya gastados o de un plan vencido vuelven a la
 * bolsa dermatológica. Lo que sigue vigente y sin usar no se toca aquí:
 * si no hay fila de reserva, el hueco que se anota es solo lo que el
 * conteo de análisis no cubre.
 */
export async function sealSkiniverCreditsBeforePlanDelete(
  db: Db,
  planId: bigint,
): Promise<void> {
  const [subs, providers, movements] = await Promise.all([
    db.subscription.findMany({
      where: { planId },
      include: {
        plan: true,
        poolAllocation: true,
        usages: { select: { quantity: true } },
      },
    }),
    db.analysisProvider.findMany({ select: { id: true, slug: true } }),
    db.platformUnitRecharge.findMany({
      where: {
        provider: SKINIVER,
        kind: { in: ['subscription_reserve', 'subscription_return'] },
      },
      select: { quantity: true, note: true },
    }),
  ]);

  const slugById = new Map(
    providers.map((row) => [row.id.toString(), row.slug]),
  );
  const netBySub = new Map<string, number>();
  for (const row of movements) {
    const id = subscriptionIdFromNote(row.note);
    if (!id) continue;
    netBySub.set(id, (netBySub.get(id) ?? 0) + row.quantity);
  }

  for (const sub of subs) {
    const allocation = sub.poolAllocation;
    if (!allocation || allocation.poolProvider !== SKINIVER) continue;
    const net = allocation.allocated - allocation.returned;
    if (net <= 0) continue;

    const credits = bagCreditsForPlan(sub.plan, slugById);
    const analyses = Math.max(0, sub.plan.analysisLimit);
    const perAnalysis = analyses > 0 ? credits / analyses : 1;
    const consumedAnalyses = sub.usages.reduce(
      (sum, usage) => sum + usage.quantity,
      0,
    );
    const consumedCredits = Math.min(
      net,
      Math.round(consumedAnalyses * perAnalysis),
    );
    const alreadyOut = Math.max(0, -(netBySub.get(sub.id.toString()) ?? 0));
    const gap = net - Math.max(alreadyOut, consumedCredits);
    if (gap <= 0) continue;

    await db.platformUnitRecharge.create({
      data: {
        provider: SKINIVER,
        kind: 'balance_writeoff',
        quantity: gap,
        note: `Borrado del plan: suscripción #${sub.id} (${gap} créditos que no vuelven)`,
      },
    });
  }
}
