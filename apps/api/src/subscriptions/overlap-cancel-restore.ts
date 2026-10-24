import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import { parsePlanProviderIds } from '../plans/plan-providers.util';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPoolService } from './subscription-pool.service';

/** Una cancelación y la activación que la provocó caen en la misma petición:
 * la activación reserva en bolsa justo después de cerrar la transacción. */
const PAREJA_MAX_MS = 2 * 60_000;

/**
 * Hasta que se arregló, activar un plan cancelaba los demás activos del
 * usuario que compartían algún análisis, aunque les quedaran créditos. Al
 * arrancar, reactiva esos planes si siguen vigentes y con créditos.
 *
 * No hay columna que diga por qué se canceló un plan. Lo delata la hora: la
 * cancelación por solapamiento deja el `updated_at` del plan viejo a
 * milisegundos de la «Activación suscripción #B» de otro plan del mismo
 * usuario en el historial de la bolsa. No se usa el movimiento «Cancelación»
 * del plan viejo porque no siempre se registra (en producción faltaba en uno
 * de los tres casos). Una cancelación del admin no cae junto a una
 * activación, y si después el admin vuelve a tocar el plan, su `updated_at`
 * se mueve y deja de emparejar. Como ya no se generan parejas nuevas, el
 * relleno se queda sin trabajo solo.
 */
@Injectable()
export class OverlapCancelRestore implements OnApplicationBootstrap {
  private readonly logger = new Logger(OverlapCancelRestore.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.reactivar();
    } catch (error) {
      // Un fallo aquí no puede impedir que el API arranque.
      this.logger.error('Reactivación de planes cancelados falló', error);
    }
  }

  /** Devuelve cuántos planes reactivó. */
  async reactivar(): Promise<number> {
    const candidatas = await this.prisma.subscription.findMany({
      where: { status: 'cancelled', endsAt: { gt: new Date() } },
      include: { plan: true },
    });
    if (candidatas.length === 0) return 0;

    const usados = await this.prisma.subscriptionUsage.groupBy({
      by: ['subscriptionId'],
      where: { subscriptionId: { in: candidatas.map((s) => s.id) } },
      _sum: { quantity: true },
    });
    const usado = new Map(
      usados.map((u) => [u.subscriptionId, u._sum.quantity ?? 0]),
    );
    const conCreditos = candidatas.filter(
      (s) => s.plan.analysisLimit - (usado.get(s.id) ?? 0) > 0,
    );
    if (conCreditos.length === 0) return 0;

    const activaciones = await this.activacionesPorSuscripcion();
    let reactivadas = 0;
    for (const sub of conCreditos) {
      if (!(await this.huboActivacionSolapada(sub, activaciones))) continue;

      try {
        await this.subscriptionPool.allocateForSubscription(
          this.prisma,
          sub.id,
          sub.plan,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo reactivar la suscripción ${sub.id}: ${String(error)}`,
        );
        continue;
      }
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'active' },
      });
      if (sub.plan.planType === 'business') {
        await syncOrganizationSeatLimitForUser(this.prisma, sub.userId);
      }
      reactivadas++;
    }

    if (reactivadas > 0) {
      this.logger.log(
        `Planes reactivados (cancelados al comprar otro): ${reactivadas}`,
      );
    }
    return reactivadas;
  }

  /** Horas de «Activación suscripción #id» del historial de la bolsa, por id
   * (el id solo está en la nota: «Activación suscripción #12 (5 créditos)»). */
  private async activacionesPorSuscripcion(): Promise<Map<bigint, number[]>> {
    const filas = await this.prisma.platformUnitRecharge.findMany({
      where: { kind: 'subscription_reserve' },
      select: { note: true, createdAt: true },
    });
    const porId = new Map<bigint, number[]>();
    for (const fila of filas) {
      const id = /suscripción #(\d+)/.exec(fila.note ?? '')?.[1];
      if (!id) continue;
      const lista = porId.get(BigInt(id)) ?? [];
      lista.push(fila.createdAt.getTime());
      porId.set(BigInt(id), lista);
    }
    return porId;
  }

  private async huboActivacionSolapada(
    sub: {
      id: bigint;
      userId: bigint;
      updatedAt: Date;
      plan: Parameters<typeof parsePlanProviderIds>[0];
    },
    activaciones: Map<bigint, number[]>,
  ): Promise<boolean> {
    const canceladaEn = sub.updatedAt.getTime();
    const proveedores = new Set(parsePlanProviderIds(sub.plan));
    const otras = await this.prisma.subscription.findMany({
      where: { userId: sub.userId, id: { not: sub.id } },
      include: { plan: true },
    });
    return otras.some(
      (otra) =>
        parsePlanProviderIds(otra.plan).some((id) => proveedores.has(id)) &&
        (activaciones.get(otra.id) ?? []).some(
          (at) => Math.abs(at - canceladaEn) <= PAREJA_MAX_MS,
        ),
    );
  }
}
