import { BadRequestException, Injectable } from '@nestjs/common';
import type { Plan, Prisma } from '@prisma/client';
import {
  BILLING_CONFIG_KEYS,
  DEFAULT_BILLING_RATES,
  copToUsdt,
  parsePlanApiCosts,
  toInternalProviderKeys,
  parsePlanCoverage,
  planCustomerPrice,
  toPublicPlanProviders,
  toPublicProviderKeys,
  toPublicProviderSlug,
} from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import { isEnterpriseDoctor } from '../doctors/doctor-account.util';
import { PrismaService } from '../prisma/prisma.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import type {
  CreatePlanDto,
  PlanCoverageDto,
  PlanFeatureDto,
} from './dto/create-plan.dto';
import type { UpdatePlanDto } from './dto/update-plan.dto';
import {
  attachProvidersToPlan,
  parsePlanProviderIds,
  resolvePlanProviderIdsFromDto,
} from './plan-providers.util';
import { PlanPoolAvailabilityService } from './plan-pool-availability.service';

function normalizePlanFeatures(
  features: PlanFeatureDto[] | undefined,
): Prisma.InputJsonValue | undefined {
  if (features === undefined) return undefined;
  return features
    .map((f) => ({
      label: String(f.label ?? '').trim(),
      included: Boolean(f.included),
    }))
    .filter((f) => f.label.length > 0)
    .slice(0, 20);
}

function normalizePlanCoverage(
  coverage: PlanCoverageDto | undefined,
): Prisma.InputJsonValue | undefined {
  if (coverage === undefined) return undefined;
  return parsePlanCoverage(coverage) as Prisma.InputJsonValue;
}

/** El panel manda slugs publicos; la columna guarda los internos, que es lo
 * que ya hay en produccion. La vuelta la da `toPublicPlanProviders`. */
function normalizeApiCosts(
  apiCosts: CreatePlanDto['apiCosts'] | undefined,
): Prisma.InputJsonValue | undefined {
  if (apiCosts === undefined) return undefined;
  return toInternalProviderKeys(
    parsePlanApiCosts(apiCosts) as Record<string, unknown>,
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  private async getIvaPercentDefault(): Promise<number> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: BILLING_CONFIG_KEYS.ivaPercentDefault },
    });
    const n = row != null ? Number(row.value) : NaN;
    return Number.isFinite(n) && n >= 0
      ? n
      : DEFAULT_BILLING_RATES.ivaPercentDefault;
  }

  /** 1 USDT = cotización USD de dolarapi. Esa API no publica USDT. */
  private async getUsdtToCop(): Promise<number> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: BILLING_CONFIG_KEYS.usdToCop },
    });
    const n = row != null ? Number(row.value) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private withCustomerPrice<
    T extends { price: unknown; ivaEnabled?: boolean; showUsdtPrice?: boolean },
  >(plan: T, ivaPercent: number, usdtToCop: number) {
    const base = Number(plan.price);
    const customer = planCustomerPrice(
      Number.isFinite(base) ? base : 0,
      Boolean(plan.ivaEnabled),
      ivaPercent,
    );
    const showUsdtPrice = Boolean(plan.showUsdtPrice);
    const usdt = showUsdtPrice ? copToUsdt(customer, usdtToCop) : null;
    return {
      ...plan,
      ivaPercent,
      customerPrice: String(customer),
      showUsdtPrice,
      usdtPrice: usdt == null ? null : String(usdt),
    };
  }

  private async enrichPlans<
    T extends Plan & {
      provider: { id: bigint; name: string; slug: string; displayLabel: string | null };
    },
  >(plans: T[]) {
    const allProviders = await this.prisma.analysisProvider.findMany({
      orderBy: { id: 'asc' },
    });
    return plans.map((plan) => attachProvidersToPlan(plan, allProviders));
  }

  /** `GET /plans` — catálogo para el selector de planes (checkout Wompi). */
  async findAll(user?: JwtPayload) {
    const [plans, ivaPercent, usdtToCop] = await Promise.all([
      this.prisma.plan.findMany({
        where: { isActive: true },
        include: { provider: true },
        orderBy: { price: 'asc' },
      }),
      this.getIvaPercentDefault(),
      this.getUsdtToCop(),
    ]);
    const enriched = await this.enrichPlans(plans);
    const withPool = await this.planPool.enrichPlans(enriched);

    const toPublic = <T extends (typeof withPool)[number]>(list: T[]) =>
      list.map((plan) =>
        toPublicPlanProviders(this.withCustomerPrice(plan, ivaPercent, usdtToCop)),
      );

    if (!user || user.role !== 'doctor') return toPublic(withPool);

    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: BigInt(user.sub) },
      select: { membershipType: true, empresa: true, empresaReferida: true },
    });

    const allowed = await this.specialtyAccess.getAllowedProviderSlugs(
      BigInt(user.sub),
    );

    const expectedPlanType = doctor && isEnterpriseDoctor(doctor) ? 'business' : 'individual';

    const filtered = withPool.filter((plan) => {
      if (plan.planType !== expectedPlanType) return false;
      return plan.providers.some((provider) =>
        allowed.includes(provider.slug as (typeof allowed)[number]),
      );
    });
    return toPublic(filtered);
  }

  /** `GET /admin/plans` */
  async findAllAdmin() {
    const [plans, ivaPercent, usdtToCop] = await Promise.all([
      this.prisma.plan.findMany({
        include: { provider: true, _count: { select: { subscriptions: true } } },
        orderBy: { id: 'asc' },
      }),
      this.getIvaPercentDefault(),
      this.getUsdtToCop(),
    ]);
    const enriched = await this.enrichPlans(plans);
    const withPool = await this.planPool.enrichPlans(enriched);
    return withPool.map((plan) =>
      toPublicPlanProviders(this.withCustomerPrice(plan, ivaPercent, usdtToCop)),
    );
  }

  /** El selector de proveedores del asistente de planes: tambien enmascarado,
   * el panel se descarga al navegador igual que el resto. */
  async findProviders() {
    const rows = await this.prisma.analysisProvider.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => ({
      ...row,
      slug: toPublicProviderSlug(row.slug),
      name: /youcam|skiniver|perfect/i.test(row.name)
        ? (row.displayLabel?.trim() || toPublicProviderSlug(row.slug))
        : row.name,
    }));
  }

  async create(dto: CreatePlanDto) {
    const planType = dto.planType ?? 'business';
    const isIndividual = planType === 'individual';
    const providerIds = resolvePlanProviderIdsFromDto(dto);

    if (providerIds.length === 0) {
      throw new BadRequestException('Selecciona al menos un análisis para el plan');
    }
    if (isIndividual && providerIds.length !== 1) {
      throw new BadRequestException('El plan individual solo puede incluir un análisis');
    }

    const creado = await this.prisma.plan.create({
      data: {
        name: dto.name,
        planType,
        analysisProviderId: BigInt(providerIds[0]),
        analysisProviderIds: providerIds,
        analysisLimit: dto.analysisLimit,
        analysisLimits: (toInternalProviderKeys(dto.analysisLimits) ??
          {}) as Prisma.InputJsonValue,
        price: dto.price,
        durationDays: dto.durationDays,
        maxUsers: isIndividual ? 1 : dto.maxUsers,
        modules: isIndividual ? [] : (dto.modules ?? []),
        roleLimits: isIndividual ? {} : (dto.roleLimits ?? {}),
        isActive: dto.isActive ?? true,
        description: dto.description,
        features: normalizePlanFeatures(dto.features) ?? [],
        coverage: normalizePlanCoverage(dto.coverage) ?? {},
        headerColor: dto.headerColor?.trim() || 'brand',
        apiCosts: normalizeApiCosts(dto.apiCosts) ?? {},
        ivaEnabled: dto.ivaEnabled ?? false,
        showUsdtPrice: dto.showUsdtPrice ?? false,
      },
      include: { provider: true },
    });
    // La fila vuelve al panel igual que el listado, asi que sale enmascarada:
    // `provider.slug`/`name`, `analysisLimits` y `apiCosts`.
    return toPublicPlanProviders(creado);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUniqueOrThrow({
      where: { id: BigInt(id) },
    });
    const planType = dto.planType ?? existing.planType;
    const isIndividual = planType === 'individual';

    const providerIds =
      dto.analysisProviderIds !== undefined || dto.analysisProviderId !== undefined
        ? resolvePlanProviderIdsFromDto(dto)
        : parsePlanProviderIds(existing);

    if (providerIds.length === 0) {
      throw new BadRequestException('Selecciona al menos un análisis para el plan');
    }
    if (isIndividual && providerIds.length !== 1) {
      throw new BadRequestException('El plan individual solo puede incluir un análisis');
    }

    const actualizado = await this.prisma.plan.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        planType: dto.planType,
        analysisProviderId: BigInt(providerIds[0]),
        analysisProviderIds: providerIds,
        analysisLimit: dto.analysisLimit,
        analysisLimits: toInternalProviderKeys(dto.analysisLimits) as
          | Prisma.InputJsonValue
          | undefined,
        price: dto.price,
        durationDays: dto.durationDays,
        maxUsers: isIndividual ? 1 : dto.maxUsers,
        modules: isIndividual ? [] : dto.modules,
        roleLimits: isIndividual ? {} : dto.roleLimits,
        isActive: dto.isActive,
        description: dto.description,
        ...(dto.features !== undefined
          ? { features: normalizePlanFeatures(dto.features) ?? [] }
          : {}),
        ...(dto.coverage !== undefined
          ? { coverage: normalizePlanCoverage(dto.coverage) ?? {} }
          : {}),
        ...(dto.headerColor !== undefined
          ? { headerColor: dto.headerColor.trim() || 'brand' }
          : {}),
        ...(dto.apiCosts !== undefined
          ? { apiCosts: normalizeApiCosts(dto.apiCosts) ?? {} }
          : {}),
        ...(dto.ivaEnabled !== undefined ? { ivaEnabled: dto.ivaEnabled } : {}),
        ...(dto.showUsdtPrice !== undefined
          ? { showUsdtPrice: dto.showUsdtPrice }
          : {}),
      },
      include: { provider: true },
    });
    return toPublicPlanProviders(actualizado);
  }

  /** Devuelve la fila borrada, asi que sus claves tambien salen publicas.
   * No lleva relacion `provider`, por eso no pasa por `toPublicPlanProviders`. */
  async remove(id: string) {
    const borrado = await this.prisma.plan.delete({ where: { id: BigInt(id) } });
    return {
      ...borrado,
      analysisLimits: toPublicProviderKeys(
        borrado.analysisLimits as Record<string, unknown> | null,
      ),
      apiCosts: toPublicProviderKeys(
        borrado.apiCosts as Record<string, unknown> | null,
      ),
    };
  }
}
