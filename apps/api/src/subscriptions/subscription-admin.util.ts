import { BadRequestException } from '@nestjs/common';
import type { AnalysisProvider, Plan, Prisma } from '@prisma/client';
import { isEnterpriseDoctor } from '../doctors/doctor-account.util';
import { attachProvidersToPlan } from '../plans/plan-providers.util';

export type AdminSubscriptionRow = Prisma.SubscriptionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        doctor: {
          select: {
            empresa: true;
            empresaReferida: true;
            membershipType: true;
          };
        };
        patient: { select: { id: true } };
      };
    };
    plan: { include: { provider: true } };
  };
}>;

export type SubscriptionAccountKind = 'empresa' | 'profesional' | 'paciente';

export function resolveSubscriptionAccountKind(
  user: AdminSubscriptionRow['user'],
): SubscriptionAccountKind {
  if (user.doctor) {
    return isEnterpriseDoctor(user.doctor) ? 'empresa' : 'profesional';
  }
  if (user.patient) return 'paciente';
  return 'paciente';
}

const ACCOUNT_KIND_LABEL: Record<SubscriptionAccountKind, string> = {
  empresa: 'Empresa',
  profesional: 'Profesional',
  paciente: 'Paciente',
};

type ProviderRow = Pick<
  AnalysisProvider,
  'id' | 'name' | 'slug' | 'displayLabel'
>;

function serializeProvider(provider: ProviderRow) {
  return {
    id: provider.id.toString(),
    name: provider.name,
    slug: provider.slug,
    displayLabel: provider.displayLabel,
  };
}

export function serializeAdminPlan(
  plan: AdminSubscriptionRow['plan'],
  allProviders: ProviderRow[],
) {
  const enriched = attachProvidersToPlan(plan, allProviders);
  return {
    id: enriched.id.toString(),
    name: enriched.name,
    planType: enriched.planType as 'individual' | 'business',
    analysisLimit: enriched.analysisLimit,
    price: enriched.price.toString(),
    durationDays: enriched.durationDays,
    maxUsers: enriched.maxUsers,
    modules: Array.isArray(enriched.modules)
      ? (enriched.modules as string[])
      : [],
    roleLimits:
      enriched.roleLimits && typeof enriched.roleLimits === 'object'
        ? (enriched.roleLimits as Record<string, number>)
        : {},
    provider: serializeProvider(enriched.provider),
    providers: enriched.providers.map(serializeProvider),
    analysisProviderIds: enriched.analysisProviderIds,
  };
}

export function serializeAdminSubscription(
  row: AdminSubscriptionRow,
  allProviders: ProviderRow[],
) {
  const accountKind = resolveSubscriptionAccountKind(row.user);
  return {
    id: row.id.toString(),
    status: row.status,
    endsAt: row.endsAt,
    wompiTransactionId: row.wompiTransactionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.user.id.toString(),
      name: row.user.name,
      email: row.user.email,
      accountKind,
      accountKindLabel: ACCOUNT_KIND_LABEL[accountKind],
    },
    plan: serializeAdminPlan(row.plan, allProviders),
  };
}

export async function loadAdminSubscriptionById(
  db: Prisma.TransactionClient | { subscription: Prisma.SubscriptionDelegate },
  id: bigint,
  allProviders: ProviderRow[],
) {
  const row = await db.subscription.findUnique({
    where: { id },
    include: {
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
    },
  });
  if (!row) {
    throw new BadRequestException('Suscripción no encontrada');
  }
  return serializeAdminSubscription(row, allProviders);
}

type AccountUser = {
  doctor: {
    empresa: boolean;
    empresaReferida: boolean;
    membershipType: string;
  } | null;
  patient: { id: bigint } | null;
};

export function assertUserMatchesPlanType(
  user: AccountUser,
  plan: Pick<Plan, 'planType' | 'name'>,
): void {
  const accountKind = resolveSubscriptionAccountKind(
    user as AdminSubscriptionRow['user'],
  );

  if (plan.planType === 'business' && accountKind !== 'empresa') {
    throw new BadRequestException(
      `El plan "${plan.name}" es empresarial y solo puede asignarse a una cuenta de empresa (correo del propietario de la organización).`,
    );
  }

  if (plan.planType === 'individual' && accountKind === 'empresa') {
    throw new BadRequestException(
      `El plan "${plan.name}" es individual. Las cuentas de empresa deben usar un plan empresarial.`,
    );
  }

  if (accountKind === 'paciente' && plan.planType === 'business') {
    throw new BadRequestException(
      'Los planes empresariales no pueden asignarse a pacientes.',
    );
  }
}
