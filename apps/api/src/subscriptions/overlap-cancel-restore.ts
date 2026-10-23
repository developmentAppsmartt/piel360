import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import { parsePlanProviderIds } from '../plans/plan-providers.util';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPoolService } from './subscription-pool.service';

/** Una cancelación y la activación que la provocó caen en la misma petición:
 * la activación reserva en bolsa justo después de cerrar la transacción. */
const PAREJA_MAX_MS = 2 * 60_000;

type Movimiento = { kind: string; at: number };

/**
 * Hasta que se arregló, activar un plan cancelaba los demás activos del
 * usuario que compartían algún análisis, aunque les quedaran créditos. Al
 * arrancar, reactiva esos planes si siguen vigentes y con créditos.
 *
 * No hay columna que diga por qué se canceló un plan; lo delata el historial
 * de la bolsa: la cancelación por solapamiento deja «Cancelación suscripción
 * #A» y, segundos después, «Activación suscripción #B» de otro plan del mismo
 * usuario. Una cancelación del admin no deja esa pareja. Solo cuenta la
 * **última** cancelación de cada plan, así que uno que el admin vuelva a
 * cancelar después no se reactiva otra vez. Como ya no se generan parejas
 * nuevas, el relleno se queda sin trabajo solo.
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

    const movimientos = await this.movimientosPorSuscripcion();
    let reactivadas = 0;
    for (const sub of conCreditos) {
      const cancelacion = movimientos
        .get(sub.id)
        ?.filter((m) => m.kind === 'subscription_return')
        .at(-1);
      if (!cancelacion) continue;
      if (
        !(await this.huboActivacionSolapada(sub, cancelacion.at, movimientos))
      )
        continue;

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

  /** Movimientos de suscripción de la bolsa, en orden, por id de suscripción
   * (el id solo está en la nota: «Cancelación suscripción #12 (5 créditos)»). */
  private async movimientosPorSuscripcion(): Promise<
    Map<bigint, Movimiento[]>
  > {
    const filas = await this.prisma.platformUnitRecharge.findMany({
      where: { kind: { in: ['subscription_return', 'subscription_reserve'] } },
      select: { kind: true, note: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const porId = new Map<bigint, Movimiento[]>();
    for (const fila of filas) {
      const id = /suscripción #(\d+)/.exec(fila.note ?? '')?.[1];
      if (!id) continue;
      const lista = porId.get(BigInt(id)) ?? [];
      lista.push({ kind: fila.kind, at: fila.createdAt.getTime() });
      porId.set(BigInt(id), lista);
    }
    return porId;
  }

  private async huboActivacionSolapada(
    sub: {
      id: bigint;
      userId: bigint;
      plan: Parameters<typeof parsePlanProviderIds>[0];
    },
    canceladaEn: number,
    movimientos: Map<bigint, Movimiento[]>,
  ): Promise<boolean> {
    const proveedores = new Set(parsePlanProviderIds(sub.plan));
    const otras = await this.prisma.subscription.findMany({
      where: { userId: sub.userId, id: { not: sub.id } },
      include: { plan: true },
    });
    return otras.some(
      (otra) =>
        parsePlanProviderIds(otra.plan).some((id) => proveedores.has(id)) &&
        (movimientos.get(otra.id) ?? []).some(
          (m) =>
            m.kind === 'subscription_reserve' &&
            Math.abs(m.at - canceladaEn) <= PAREJA_MAX_MS,
        ),
    );
  }
}
