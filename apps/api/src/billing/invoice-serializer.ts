import type { Prisma } from '@prisma/client';

export const INVOICE_INCLUDE = {
  plan: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, email: true } },
  organization: { select: { id: true, name: true } },
  subscription: { select: { id: true, status: true } },
} as const;

export type InvoiceWithRelations = Prisma.SubscriptionInvoiceGetPayload<{
  include: typeof INVOICE_INCLUDE;
}>;

/** Factura con su desglose económico, tal como la pinta el admin. */
export function serializeInvoice(inv: InvoiceWithRelations) {
  return {
    id: inv.id.toString(),
    subscriptionId: inv.subscriptionId.toString(),
    subscriptionStatus: inv.subscription.status,
    user: {
      id: inv.user.id.toString(),
      name: inv.user.name,
      email: inv.user.email,
    },
    plan: {
      id: inv.plan.id.toString(),
      name: inv.plan.name,
    },
    organization: inv.organization
      ? {
          id: inv.organization.id.toString(),
          name: inv.organization.name,
        }
      : null,
    grossAmount: Number(inv.grossAmount),
    planBaseAmount: Number(inv.planBaseAmount ?? inv.grossAmount),
    ivaPercent: Number(inv.ivaPercent ?? 0),
    ivaAmount: Number(inv.ivaAmount ?? 0),
    gatewayFeePercent: Number(inv.gatewayFeePercent),
    gatewayFeeAmount: Number(inv.gatewayFeeAmount),
    netAfterGateway: Number(inv.netAfterGateway),
    operationalCostPercent: Number(inv.operationalCostPercent ?? 0),
    operationalCostAmount: Number(inv.operationalCostAmount),
    apiTokenCostAmount: Number(inv.apiTokenCostAmount ?? 0),
    usdRateSnapshot:
      inv.usdRateSnapshot != null ? Number(inv.usdRateSnapshot) : null,
    eurRateSnapshot:
      inv.eurRateSnapshot != null ? Number(inv.eurRateSnapshot) : null,
    commissionBaseAmount: Number(inv.commissionBaseAmount),
    isReferredSale: inv.isReferredSale,
    alliedCommissionPercent:
      inv.alliedCommissionPercent != null
        ? Number(inv.alliedCommissionPercent)
        : null,
    alliedCommissionAmount: Number(inv.alliedCommissionAmount),
    platformNetAmount: Number(inv.platformNetAmount),
    currency: inv.currency,
    wompiTransactionId: inv.wompiTransactionId,
    alliedPayoutStatus: inv.alliedPayoutStatus as
      'none' | 'pending' | 'processing' | 'dispersed',
    alliedDispersedAt: inv.alliedDispersedAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}
