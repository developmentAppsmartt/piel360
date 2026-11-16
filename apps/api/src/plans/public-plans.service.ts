import { Injectable } from '@nestjs/common';
import { planCustomerPrice } from '@piel360/shared';
import { planSaleType } from '../billing/plan-sale-type';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from './plans.service';

/**
 * Catálogo de la landing pública, recortado a lo comercial: sin costos del
 * proveedor, límites por rol ni slugs (lo descarga cualquiera).
 *
 * No pasa por `PlansService.findAll`: ese enriquece con la disponibilidad de
 * la bolsa, que sincroniza los saldos (escribe en la base) y consulta al
 * proveedor externo en cada llamada. Una página pública no puede disparar eso.
 */
@Injectable()
export class PublicPlansService {
  constructor(
    private readonly plans: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  async findCatalog() {
    const [plans, providers, ivaPercent] = await Promise.all([
      this.prisma.plan.findMany({
        where: { isActive: true, replacedAt: null },
        orderBy: { price: 'asc' },
      }),
      this.prisma.analysisProvider.findMany({
        select: { id: true, slug: true },
      }),
      this.plans.getIvaPercentDefault(),
    ]);
    const slugById = new Map(providers.map((p) => [p.id.toString(), p.slug]));

    return plans.map((plan) => ({
      id: plan.id.toString(),
      name: plan.name,
      description: plan.description,
      planType: plan.planType,
      saleType: planSaleType(plan, slugById),
      customerPrice: planCustomerPrice(
        Number(plan.price),
        plan.ivaEnabled,
        ivaPercent,
      ),
      durationDays: plan.durationDays,
      analysisLimit: plan.analysisLimit,
      maxUsers: plan.maxUsers,
      features: plan.features,
      headerColor: plan.headerColor,
    }));
  }
}
