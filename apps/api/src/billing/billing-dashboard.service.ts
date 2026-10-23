import { Injectable } from '@nestjs/common';
import { colombiaDateKey } from '@piel360/shared';
import { resolveReportRange } from '../doctor-reports/report-range';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingDashboardQueryDto } from './dto/billing-dashboard-query.dto';
import { INVOICE_INCLUDE, serializeInvoice } from './invoice-serializer';
import { planSaleType, type PlanSaleType } from './plan-sale-type';
import { SalesGoalsService } from './sales-goals.service';

/** Sin fechas: los últimos 30 días, como el filtro por defecto del panel. */
const DEFAULT_DAYS = 30;

export type PurchaseStatus = 'completed' | 'pending' | 'rejected' | 'manual';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Estado de la compra según la pasarela. La factura solo existe si Wompi
 * aprobó el pago. Al pagar se crea la suscripción `pending` con la referencia
 * en `wompiTransactionId`; el admin crea las suyas sin ella.
 */
function purchaseStatus(sub: {
  status: string;
  wompiTransactionId: string | null;
  endsAt: Date | null;
  hasInvoice: boolean;
}): PurchaseStatus {
  if (sub.hasInvoice) return 'completed';
  if (sub.status === 'pending') return 'pending';
  if (!sub.wompiTransactionId) return 'manual';
  // Sin factura pero pagadas: las de antes de que existiera la facturación.
  // Solo el pago aprobado fija `endsAt`; el rechazo pasa de `pending` a
  // `cancelled` sin él. En producción había pagadas que luego se cancelaron
  // (al comprar otro plan) y no son rechazos.
  return sub.endsAt ? 'completed' : 'rejected';
}

@Injectable()
export class BillingDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goals: SalesGoalsService,
  ) {}

  /**
   * Panel «Facturación y metas de ventas». Las compras son suscripciones (con
   * o sin pago); el dinero sale solo de las facturas, que son lo cobrado. Una
   * compra cae en la fecha de su factura si está pagada, o en la de creación.
   */
  async getDashboard(query: BillingDashboardQueryDto) {
    const range = resolveReportRange(
      { from: query.from, to: query.to },
      DEFAULT_DAYS,
    );
    const inRange = { gte: range.from, lt: range.toExclusive };

    const [providers, subscriptions, pendingGlobal] = await Promise.all([
      this.prisma.analysisProvider.findMany({
        select: { id: true, slug: true },
      }),
      this.prisma.subscription.findMany({
        where: {
          OR: [
            { invoice: { createdAt: inRange } },
            { invoice: null, createdAt: inRange },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              analysisLimit: true,
              analysisProviderIds: true,
              analysisProviderId: true,
            },
          },
          invoice: { include: INVOICE_INCLUDE },
        },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { alliedPayoutStatus: 'pending' },
        _sum: { alliedCommissionAmount: true },
      }),
    ]);
    const slugById = new Map(providers.map((p) => [p.id.toString(), p.slug]));

    const purchases = subscriptions
      .map((sub) => {
        const invoice = sub.invoice ? serializeInvoice(sub.invoice) : null;
        return {
          id: sub.id.toString(),
          date: (sub.invoice?.createdAt ?? sub.createdAt).toISOString(),
          user: {
            id: sub.user.id.toString(),
            name: sub.user.name,
            email: sub.user.email,
          },
          organization: invoice?.organization ?? null,
          plan: { id: sub.plan.id.toString(), name: sub.plan.name },
          planType: planSaleType(sub.plan, slugById),
          credits: sub.plan.analysisLimit,
          amount: invoice?.grossAmount ?? Number(sub.plan.price),
          status: purchaseStatus({ ...sub, hasInvoice: invoice != null }),
          isReferredSale: invoice?.isReferredSale ?? false,
          invoice,
        };
      })
      .filter((p) => !query.planType || p.planType === query.planType)
      .sort((a, b) => b.date.localeCompare(a.date));

    // Los totales contables salen de las facturas; «Compras por tipo de plan»
    // cuenta todas las completadas, también las pagadas antes de que hubiera
    // facturación (activas sin factura), para cuadrar con la tabla.
    const invoices = purchases.flatMap((p) => (p.invoice ? [p.invoice] : []));
    const completed = purchases.filter((p) => p.status === 'completed');
    const byType: Record<PlanSaleType, number> = {
      aesthetic: 0,
      derm: 0,
      fototipo: 0,
      mixed: 0,
    };
    for (const p of completed) byType[p.planType] += 1;

    return {
      range: {
        from: colombiaDateKey(range.from),
        to: colombiaDateKey(range.to),
      },
      metrics: {
        ...this.invoiceMetrics(invoices),
        alliedPendingGlobal: roundMoney(
          Number(pendingGlobal._sum.alliedCommissionAmount ?? 0),
        ),
      },
      byType: {
        purchaseCount: completed.length,
        grossTotal: roundMoney(completed.reduce((s, p) => s + p.amount, 0)),
        counts: byType,
      },
      purchases,
      goals: await this.goals.summary(
        colombiaDateKey(range.to).slice(0, 7),
        slugById,
      ),
    };
  }

  private invoiceMetrics(invoices: ReturnType<typeof serializeInvoice>[]) {
    const sum = (pick: (i: (typeof invoices)[number]) => number) =>
      roundMoney(invoices.reduce((total, inv) => total + pick(inv), 0));
    const referred = invoices.filter((i) => i.isReferredSale).length;
    return {
      invoiceCount: invoices.length,
      grossTotal: sum((i) => i.grossAmount),
      gatewayFeesTotal: sum((i) => i.gatewayFeeAmount),
      platformNetTotal: sum((i) => i.platformNetAmount),
      alliedCommissionsTotal: sum((i) => i.alliedCommissionAmount),
      alliedPendingTotal: sum((i) =>
        i.alliedPayoutStatus === 'pending' ? i.alliedCommissionAmount : 0,
      ),
      alliedDispersedTotal: sum((i) =>
        i.alliedPayoutStatus === 'dispersed' ? i.alliedCommissionAmount : 0,
      ),
      referredSalesCount: referred,
      commonSalesCount: invoices.length - referred,
    };
  }
}
