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
