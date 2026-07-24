import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePlanDto } from './dto/create-plan.dto';
import type { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /plans` — catálogo para el selector de planes (checkout Wompi). */
  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: { price: 'asc' },
    });
  }

  /** `GET /admin/plans` — a diferencia del catálogo público, incluye los
   * inactivos y el conteo de suscripciones (necesario para advertir antes
   * de borrar — `Subscription.plan` tiene `onDelete: Cascade`). */
  findAllAdmin() {
    return this.prisma.plan.findMany({
      include: { provider: true, _count: { select: { subscriptions: true } } },
      orderBy: { id: 'asc' },
    });
  }

  /** `GET /admin/analysis-providers` — para el `<select>` del formulario. */
  findProviders() {
    return this.prisma.analysisProvider.findMany({ orderBy: { id: 'asc' } });
  }

  create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        analysisProviderId: BigInt(dto.analysisProviderId),
        analysisLimit: dto.analysisLimit,
        price: dto.price,
        durationDays: dto.durationDays,
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
    });
  }

  update(id: string, dto: UpdatePlanDto) {
    return this.prisma.plan.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        analysisProviderId: dto.analysisProviderId
          ? BigInt(dto.analysisProviderId)
          : undefined,
        analysisLimit: dto.analysisLimit,
        price: dto.price,
        durationDays: dto.durationDays,
        isActive: dto.isActive,
        description: dto.description,
      },
    });
  }

  /** Borra el plan — cascada real sobre `Subscription`/`SubscriptionUsage`
   * (ver `onDelete: Cascade` en el schema). El frontend advierte con el
   * conteo de `findAllAdmin` antes de llamar acá; no se repite la validación
   * en el backend para no duplicar la fuente de verdad del conteo. */
  remove(id: string) {
    return this.prisma.plan.delete({ where: { id: BigInt(id) } });
  }
}
