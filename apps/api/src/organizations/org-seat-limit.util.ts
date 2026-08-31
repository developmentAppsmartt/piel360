import { seatPlanFromLimit } from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Ajusta `seatLimit` / `seatPlan` de la organización del dueño según sus
 * suscripciones business activas (usa el mayor `plan.maxUsers`).
 */
export async function syncOrganizationSeatLimitForUser(
  db: Db,
  userId: bigint,
): Promise<{ seatLimit: number; seatPlan: string } | null> {
  const org = await db.organization.findFirst({
    where: { ownerUserId: userId },
    select: { id: true, seatLimit: true, seatPlan: true },
  });
  if (!org) return null;

  const now = new Date();
  const activeSubs = await db.subscription.findMany({
    where: {
      userId,
      status: 'active',
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { plan: { select: { planType: true, maxUsers: true } } },
  });

  const limits = activeSubs
    .filter((sub) => sub.plan.planType === 'business')
    .map((sub) => sub.plan.maxUsers)
    .filter((maxUsers) => maxUsers > 0);

  if (limits.length === 0) {
    return { seatLimit: org.seatLimit, seatPlan: org.seatPlan };
  }

  const seatLimit = Math.max(...limits);
  const seatPlan = seatPlanFromLimit(seatLimit);

  if (org.seatLimit === seatLimit && org.seatPlan === seatPlan) {
    return { seatLimit, seatPlan };
  }

  await db.organization.update({
    where: { id: org.id },
    data: { seatLimit, seatPlan },
  });

  return { seatLimit, seatPlan };
}
