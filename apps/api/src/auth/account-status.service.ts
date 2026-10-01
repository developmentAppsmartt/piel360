import { Injectable } from '@nestjs/common';
import {
  EXPIRED_PLAN_DATA_RETENTION_DAYS,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  type AccountStatus,
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
      : { planRestricted: false, expiredPlans: [] };

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
  private async resolvePlanState(
    userId: bigint,
  ): Promise<Pick<AccountStatus, 'planRestricted' | 'expiredPlans'>> {
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
    if (!user?.doctor || !isDoctorVerificationActive(user.doctor.verificationStatus)) {
      return { planRestricted: false, expiredPlans: [] };
    }

    const membership = user.organizationMembers[0];
    const billingUserId =
      membership?.memberRole === 'member'
        ? membership.organization.ownerUserId
        : userId;

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: billingUserId, status: 'active' },
      include: { plan: { select: { id: true, name: true, durationDays: true } } },
      orderBy: { id: 'desc' },
    });

    const now = new Date();
    const withEnds = subscriptions.map((subscription) => ({
      subscription,
      endsAt: resolveSubscriptionEndsAt(subscription, subscription.plan),
    }));
    if (withEnds.some(({ endsAt }) => endsAt !== null && endsAt > now)) {
      return { planRestricted: false, expiredPlans: [] };
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

    return { planRestricted: true, expiredPlans };
  }
}
