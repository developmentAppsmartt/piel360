import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

type EndsAtPlan = { durationDays: number };

type EndsAtSubscription = {
  endsAt: Date | null;
  status: string;
  createdAt: Date;
};

export function computeSubscriptionEndsAt(
  plan: EndsAtPlan,
  from: Date = new Date(),
): Date {
  const endsAt = new Date(from);
  endsAt.setDate(endsAt.getDate() + plan.durationDays);
  return endsAt;
}

/** Fecha efectiva de vigencia (persistida o compra + duración del plan). */
export function resolveSubscriptionEndsAt(
  subscription: EndsAtSubscription,
  plan: EndsAtPlan,
): Date | null {
  if (subscription.endsAt) return subscription.endsAt;
  if (subscription.status !== 'active') return null;
  if (!plan.durationDays || plan.durationDays <= 0) return null;
  return computeSubscriptionEndsAt(plan, subscription.createdAt);
}

/** Persiste `endsAt` en una suscripción activa que aún no lo tiene. */
export async function ensureSubscriptionEndsAt(
  db: PrismaService | Prisma.TransactionClient,
  subscription: EndsAtSubscription & { id: bigint; plan: EndsAtPlan },
): Promise<Date | null> {
  if (subscription.endsAt) return subscription.endsAt;
  const resolved = resolveSubscriptionEndsAt(subscription, subscription.plan);
  if (!resolved) return null;
  await db.subscription.update({
    where: { id: subscription.id },
    data: { endsAt: resolved },
  });
  return resolved;
}
