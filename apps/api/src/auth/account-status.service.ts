import { Injectable } from '@nestjs/common';
import {
  EXPIRED_PLAN_DATA_RETENTION_DAYS,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  type AccountStatus,
  type DepletedPlanInfo,
  type ExpiredPlanInfo,
  type Role,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSubscriptionEndsAt } from '../subscriptions/subscription-ends.util';

export type DisabledInfo = {
  disabledAt: Date;
  disabledReason: string | null;
  scope: 'user' | 'organization';
};

const MAX_EXPIRED_PLANS = 3;
const MAX_CONSUMED_PLANS = 4;

type PlanState = Pick<
  AccountStatus,
  'planRestricted' | 'expiredPlans' | 'depletedPlans'
>;

const NO_PLAN_STATE: PlanState = {
  planRestricted: false,
  expiredPlans: [],
  depletedPlans: [],
};

@Injectable()
export class AccountStatusService {
  constructor(private readonly prisma: PrismaService) {}

  /** Deshabilitado directo, o miembro de una empresa cuyo dueño está deshabilitado. */
  async resolveDisabled(userId: bigint): Promise<DisabledInfo | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        disabledAt: true,
        disabledReason: true,
        organizationMembers: {
          where: { memberRole: 'member' },
          take: 1,
          select: {
            organization: {
              select: {
                owner: { select: { disabledAt: true, disabledReason: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return null;
    if (user.disabledAt) {
      return {
        disabledAt: user.disabledAt,
        disabledReason: user.disabledReason,
        scope: 'user',
      };
    }
    const owner = user.organizationMembers[0]?.organization.owner;
    if (owner?.disabledAt) {
      return {
        disabledAt: owner.disabledAt,
        disabledReason: owner.disabledReason,
        scope: 'organization',
      };
    }
    return null;
  }

  async getStatus(userId: bigint, role: Role): Promise<AccountStatus> {
    const disabled = await this.resolveDisabled(userId);
    const plan = isClinicalPanelRole(role)
      ? await this.resolvePlanState(userId)
      : NO_PLAN_STATE;

    return {
      disabled: Boolean(disabled),
      disabledReason: disabled?.disabledReason ?? null,
      disabledAt: disabled?.disabledAt.toISOString() ?? null,
      disabledScope: disabled?.scope ?? null,
      ...plan,
    };
  }

  /**
   * Solo aplica a profesionales verificados (los pendientes ya tienen su
   * propio menú restringido). Los miembros de equipo usan el plan del dueño.
   */
  private async resolvePlanState(userId: bigint): Promise<PlanState> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        doctor: { select: { verificationStatus: true } },
        organizationMembers: {
          take: 1,
          select: {
            memberRole: true,
            organization: { select: { ownerUserId: true } },
          },
        },
      },
    });
    if (
      !user?.doctor ||
      !isDoctorVerificationActive(user.doctor.verificationStatus)
    ) {
      return NO_PLAN_STATE;
    }

    const membership = user.organizationMembers[0];
    const billingUserId =
      membership?.memberRole === 'member'
        ? membership.organization.ownerUserId
        : userId;

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: billingUserId, status: 'active' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            durationDays: true,
            analysisLimit: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const now = new Date();
    const withEnds = subscriptions.map((subscription) => ({
      subscription,
      endsAt: resolveSubscriptionEndsAt(subscription, subscription.plan),
    }));
    if (withEnds.some(({ endsAt }) => endsAt !== null && endsAt > now)) {
      return {
        planRestricted: false,
        expiredPlans: [],
        depletedPlans: await this.resolveConsumedPlans(withEnds, now),
      };
    }

    const latestByPlan = new Map<string, ExpiredPlanInfo & { ts: number }>();
    for (const { subscription, endsAt } of withEnds) {
      if (!endsAt) continue;
      const key = subscription.plan.id.toString();
      const previous = latestByPlan.get(key);
      if (previous && previous.ts >= endsAt.getTime()) continue;
      const deletion = new Date(endsAt);
      deletion.setDate(deletion.getDate() + EXPIRED_PLAN_DATA_RETENTION_DAYS);
      latestByPlan.set(key, {
        planName: subscription.plan.name,
        endedAt: endsAt.toISOString(),
        dataDeletionAt: deletion.toISOString(),
        ts: endsAt.getTime(),
      });
    }

    const expiredPlans = [...latestByPlan.values()]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_EXPIRED_PLANS)
      .map(({ ts: _ts, ...info }) => info);

    return { planRestricted: true, expiredPlans, depletedPlans: [] };
  }

  /**
   * Planes "consumidos" mientras la cuenta conserva otro vigente:
   * - vigentes que gastaron todos sus análisis (mismo cálculo que
   *   SubscriptionsService.remainingCredits);
   * - vencidos cuyos datos aún no se eliminan, salvo que ese mismo plan ya se
   *   haya renovado (uno por plan, el más reciente).
   */
  private async resolveConsumedPlans(
    withEnds: {
      subscription: {
        id: bigint;
        plan: { id: bigint; name: string; analysisLimit: number };
      };
      endsAt: Date | null;
    }[],
    now: Date,
  ): Promise<DepletedPlanInfo[]> {
    const current = withEnds.filter(
      ({ endsAt }) => endsAt !== null && endsAt > now,
    );
    const currentPlanIds = new Set(
      current.map(({ subscription }) => subscription.plan.id.toString()),
    );

    const expiredByPlan = new Map<string, (typeof withEnds)[number]>();
    for (const entry of withEnds) {
      const { subscription, endsAt } = entry;
      if (!endsAt || endsAt > now) continue;
      if (deletionDate(endsAt) <= now) continue;
      const planKey = subscription.plan.id.toString();
      if (currentPlanIds.has(planKey)) continue;
      const previous = expiredByPlan.get(planKey);
      if (previous?.endsAt && previous.endsAt >= endsAt) continue;
      expiredByPlan.set(planKey, entry);
    }
    const expired = [...expiredByPlan.values()];

    const relevant = [...current, ...expired];
    const usage = relevant.length
      ? await this.prisma.subscriptionUsage.groupBy({
          by: ['subscriptionId'],
          where: {
            subscriptionId: {
              in: relevant.map(({ subscription }) => subscription.id),
            },
          },
          _sum: { quantity: true },
        })
      : [];
    const usedBySubscription = new Map(
      usage.map((row) => [
        row.subscriptionId.toString(),
        row._sum.quantity ?? 0,
      ]),
    );
    const remainingOf = (
      subscription: (typeof withEnds)[number]['subscription'],
    ) =>
      Math.max(
        0,
        subscription.plan.analysisLimit -
          (usedBySubscription.get(subscription.id.toString()) ?? 0),
      );

    const depleted: DepletedPlanInfo[] = current
      .filter(
        ({ subscription }) =>
          subscription.plan.analysisLimit > 0 &&
          remainingOf(subscription) === 0,
      )
      .map(({ subscription, endsAt }) => ({
        subscriptionId: subscription.id.toString(),
        planName: subscription.plan.name,
        reason: 'credits',
        analysisLimit: subscription.plan.analysisLimit,
        remaining: 0,
        endsAt: endsAt?.toISOString() ?? null,
        dataDeletionAt: null,
      }));

    const ended: DepletedPlanInfo[] = expired
      .sort((a, b) => (b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0))
      .map(({ subscription, endsAt }) => ({
        subscriptionId: subscription.id.toString(),
        planName: subscription.plan.name,
        reason: 'expired',
        analysisLimit: subscription.plan.analysisLimit,
        remaining: remainingOf(subscription),
        endsAt: endsAt?.toISOString() ?? null,
        dataDeletionAt: endsAt ? deletionDate(endsAt).toISOString() : null,
      }));

    return [...depleted, ...ended].slice(0, MAX_CONSUMED_PLANS);
  }
}

function deletionDate(endsAt: Date): Date {
  const deletion = new Date(endsAt);
  deletion.setDate(deletion.getDate() + EXPIRED_PLAN_DATA_RETENTION_DAYS);
  return deletion;
}
