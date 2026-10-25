import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  assertUserMatchesPlanType,
  loadAdminSubscriptionById,
  serializeAdminSubscription,
} from './subscription-admin.util';
import {
  computeSubscriptionEndsAt,
  ensureSubscriptionEndsAt,
} from './subscription-ends.util';
import { SubscriptionPoolService } from './subscription-pool.service';

/**
 * CRUD de suscripciones del admin, sin pasar por Wompi — equivalente al
 * «el admin puede activar suscripciones sin pago» de MIGRACION.md §2.4.
 */
@Injectable()
export class SubscriptionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
    @Inject(forwardRef(() => PlanPoolAvailabilityService))
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  private readonly adminSubscriptionInclude = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            membershipType: true,
          },
        },
        patient: { select: { id: true } },
      },
    },
    plan: { include: { provider: true } },
  } as const;

  private async listAllProviders() {
    return this.prisma.analysisProvider.findMany({ orderBy: { id: 'asc' } });
  }

  /** Creación manual (admin), sin pasar por Wompi — activa por defecto. */
  async createManual(dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });
    if (!plan) throw new BadRequestException('Plan no encontrado');

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(dto.userId) },
      include: {
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            membershipType: true,
          },
        },
        patient: { select: { id: true } },
      },
    });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    assertUserMatchesPlanType(user, plan);

    const status = dto.status === 'cancelled' ? 'cancelled' : 'active';
    const endsAt = computeSubscriptionEndsAt(plan);

    if (status === 'active') {
      await this.planPool.assertPlanPurchasable(plan);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status,
        endsAt: status === 'active' ? endsAt : null,
      },
    });

    if (subscription.status === 'active') {
      await this.subscriptionPool.allocateForSubscription(
        this.prisma,
        subscription.id,
        plan,
      );
    }

    if (subscription.status === 'active' && plan.planType === 'business') {
      await syncOrganizationSeatLimitForUser(this.prisma, subscription.userId);
    }

    const providers = await this.listAllProviders();
    return loadAdminSubscriptionById(this.prisma, subscription.id, providers);
  }

  /** `GET /admin/subscriptions` — lista completa para el CRUD admin. `select`
   * explícito en `user` (no `include: true`) para no filtrar el hash de la
   * contraseña, mismo cuidado que en `doctors.service.ts`. */
  async findAllAdmin() {
    const [rows, providers] = await Promise.all([
      this.prisma.subscription.findMany({
        include: this.adminSubscriptionInclude,
        orderBy: { id: 'desc' },
      }),
      this.listAllProviders(),
    ]);

    await Promise.all(
      rows
        .filter((row) => row.status === 'active' && !row.endsAt)
        .map(async (row) => {
          row.endsAt = await ensureSubscriptionEndsAt(this.prisma, row);
        }),
    );

    await this.subscriptionPool.syncActiveSubscriptionPools();

    return rows.map((row) => serializeAdminSubscription(row, providers));
  }

  /** Edición manual (admin) — bypass del flujo Wompi, igual que el
   * `SubscriptionForm` del Laravel viejo permitía fijar cualquier campo
   * directamente. */
  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: BigInt(id) },
      include: {
        plan: true,
        user: {
          include: {
            doctor: {
              select: {
                empresa: true,
                empresaReferida: true,
                membershipType: true,
              },
            },
            patient: { select: { id: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new BadRequestException('Suscripción no encontrada');
    }

    const nextUserId = dto.userId ? BigInt(dto.userId) : existing.userId;
    const nextPlanId = dto.planId ? BigInt(dto.planId) : existing.planId;

    const [nextUser, nextPlan] = await Promise.all([
      nextUserId === existing.userId
        ? Promise.resolve(existing.user)
        : this.prisma.user.findUnique({
            where: { id: nextUserId },
            include: {
              doctor: {
                select: {
                  empresa: true,
                  empresaReferida: true,
                  membershipType: true,
                },
              },
              patient: { select: { id: true } },
            },
          }),
      nextPlanId === existing.planId
        ? Promise.resolve(existing.plan)
        : this.prisma.plan.findUnique({ where: { id: nextPlanId } }),
    ]);

    if (!nextUser) throw new BadRequestException('Usuario no encontrado');
    if (!nextPlan) throw new BadRequestException('Plan no encontrado');
    assertUserMatchesPlanType(nextUser, nextPlan);

    const nextStatus = dto.status ?? existing.status;
    const wasActive = existing.status === 'active';
    const willBeActive = nextStatus === 'active';
    const willBeCancelled = nextStatus === 'cancelled';
    const activating = willBeActive && !wasActive;
    const planChanged = nextPlanId !== existing.planId;

    const needsPoolAllocation =
      activating ||
      (willBeActive && wasActive && planChanged) ||
      (willBeActive && !existing.endsAt);

    if (needsPoolAllocation) {
      const allocation =
        await this.prisma.subscriptionPoolAllocation.findUnique({
          where: { subscriptionId: existing.id },
          select: { returned: true },
        });
      // Reactivar tras cancelar solo re-compromete el restante ya devuelto,
      // no exige el total del plan en bolsa.
      const isReactivation =
        activating && allocation != null && allocation.returned > 0;
      if (!isReactivation) {
        await this.planPool.assertPlanPurchasable(nextPlan);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (willBeCancelled && wasActive) {
        await this.subscriptionPool.returnUnusedCredits(tx, existing.id);
      }

      const reactivate = willBeActive && wasActive && planChanged;

      if (reactivate) {
        await this.subscriptionPool.returnUnusedCredits(tx, existing.id);
        await tx.subscriptionPoolAllocation.deleteMany({
          where: { subscriptionId: existing.id },
        });
      }

      const endsAt = willBeActive
        ? computeSubscriptionEndsAt(
            nextPlan,
            activating || reactivate || !existing.endsAt
              ? new Date()
              : (existing.endsAt ?? new Date()),
          )
        : existing.endsAt;

      return tx.subscription.update({
        where: { id: BigInt(id) },
        data: {
          userId: dto.userId ? nextUserId : undefined,
          planId: dto.planId ? nextPlanId : undefined,
          status: dto.status ?? existing.status,
          endsAt: willBeActive ? endsAt : existing.endsAt,
        },
        include: { plan: { select: { planType: true } } },
      });
    });

    if (updated.status === 'active') {
      await this.subscriptionPool.allocateForSubscription(
        this.prisma,
        updated.id,
        nextPlan,
      );
    }

    if (updated.status === 'active' && updated.plan.planType === 'business') {
      await syncOrganizationSeatLimitForUser(this.prisma, updated.userId);
    }

    const providers = await this.listAllProviders();
    return loadAdminSubscriptionById(this.prisma, updated.id, providers);
  }

  /** Borra la suscripción — cascada solo sobre su propio `SubscriptionUsage`
   * (`onDelete: Cascade` en el schema), no afecta otras suscripciones ni los
   * `Analysis` en sí. */
  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { id: BigInt(id) },
      });
      if (!sub) throw new BadRequestException('Suscripción no encontrada');
      if (sub.status === 'active') {
        await this.subscriptionPool.returnUnusedCredits(tx, sub.id);
      }
      await tx.subscription.delete({ where: { id: sub.id } });
    });
  }
}
