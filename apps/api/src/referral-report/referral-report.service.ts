import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ReferralReportRow = {
  id: string;
  organization: { id: string; name: string };
  code: string;
  professional: { name: string; email: string };
  specialty: string | null;
  planName: string | null;
  commissionPercent: number | null;
  commissionValue: number;
  /** Fecha de la compra; sin compras, la del registro con el código. */
  date: string;
};

const ALLIED = 'empresa_aliada';

/**
 * Referidos de las empresas aliadas: una fila por compra del profesional
 * referido (su factura guarda el plan, el % y el valor de la comisión que se
 * le paga a la aliada) y una fila sin plan para el que todavía no compra.
 */
@Injectable()
export class ReferralReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** La aliada de la que es dueño el usuario; 403 si no tiene. */
  async alliedOrganizationOf(userId: string): Promise<bigint> {
    const org = await this.prisma.organization.findFirst({
      where: { ownerUserId: BigInt(userId), type: ALLIED },
      select: { id: true },
    });
    if (!org) {
      throw new ForbiddenException(
        'Solo las empresas aliadas tienen reporte de referidos',
      );
    }
    return org.id;
  }

  async rows(organizationId?: bigint): Promise<ReferralReportRow[]> {
    const referrals = await this.prisma.referral.findMany({
      where: {
        referredUserId: { not: null },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        organization: {
          select: { id: true, name: true, referralCommissionPercent: true },
        },
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            doctor: { select: { specialty: true } },
          },
        },
      },
    });
    if (referrals.length === 0) return [];

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: {
        userId: { in: referrals.map((r) => r.referredUserId!) },
        organizationId: { in: referrals.map((r) => r.organizationId) },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        alliedCommissionPercent: true,
        alliedCommissionAmount: true,
        createdAt: true,
        plan: { select: { name: true } },
      },
    });

    const rows = referrals.flatMap((referral): ReferralReportRow[] => {
      const user = referral.referredUser!;
      const base = {
        organization: {
          id: referral.organization.id.toString(),
          name: referral.organization.name,
        },
        code: referral.code,
        professional: { name: user.name, email: user.email },
        specialty: user.doctor?.specialty ?? null,
      };
      const own = invoices.filter(
        (inv) =>
          inv.userId === user.id &&
          inv.organizationId === referral.organizationId,
      );
      if (own.length === 0) {
        const percent = referral.organization.referralCommissionPercent;
        return [
          {
            ...base,
            id: `referral-${referral.id.toString()}`,
            planName: null,
            commissionPercent: percent != null ? Number(percent) : null,
            commissionValue: 0,
            date: referral.createdAt.toISOString(),
          },
        ];
      }
      return own.map((inv) => ({
        ...base,
        id: `invoice-${inv.id.toString()}`,
        planName: inv.plan.name,
        commissionPercent:
          inv.alliedCommissionPercent != null
            ? Number(inv.alliedCommissionPercent)
            : null,
        commissionValue: Number(inv.alliedCommissionAmount),
        date: inv.createdAt.toISOString(),
      }));
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }
}
