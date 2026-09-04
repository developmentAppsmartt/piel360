import { BadRequestException, Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import type { JwtPayload } from '../auth/types';
import { isEnterpriseDoctor } from '../doctors/doctor-account.util';
import { PrismaService } from '../prisma/prisma.service';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';
import type { CreatePlanDto } from './dto/create-plan.dto';
import type { UpdatePlanDto } from './dto/update-plan.dto';
import {
  attachProvidersToPlan,
  parsePlanProviderIds,
  resolvePlanProviderIdsFromDto,
} from './plan-providers.util';
import { PlanPoolAvailabilityService } from './plan-pool-availability.service';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

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
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: { price: 'asc' },
    });
    const enriched = await this.enrichPlans(plans);
    const withPool = await this.planPool.enrichPlans(enriched);

    if (!user || user.role !== 'doctor') return withPool;

    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: BigInt(user.sub) },
      select: { membershipType: true, empresa: true, empresaReferida: true },
    });

    const allowed = await this.specialtyAccess.getAllowedProviderSlugs(
      BigInt(user.sub),
    );

    const expectedPlanType = doctor && isEnterpriseDoctor(doctor) ? 'business' : 'individual';

    return withPool.filter((plan) => {
      if (plan.planType !== expectedPlanType) return false;
      return plan.providers.some((provider) =>
        allowed.includes(provider.slug as (typeof allowed)[number]),
      );
    });
  }

  /** `GET /admin/plans` */
  async findAllAdmin() {
    const plans = await this.prisma.plan.findMany({
      include: { provider: true, _count: { select: { subscriptions: true } } },
      orderBy: { id: 'asc' },
    });
    const enriched = await this.enrichPlans(plans);
    return this.planPool.enrichPlans(enriched);
  }

  findProviders() {
    return this.prisma.analysisProvider.findMany({ orderBy: { id: 'asc' } });
  }

  create(dto: CreatePlanDto) {
    const planType = dto.planType ?? 'business';
    const isIndividual = planType === 'individual';
    const providerIds = resolvePlanProviderIdsFromDto(dto);

    if (providerIds.length === 0) {
      throw new BadRequestException('Selecciona al menos un análisis para el plan');
    }
    if (isIndividual && providerIds.length !== 1) {
      throw new BadRequestException('El plan individual solo puede incluir un análisis');
    }

    return this.prisma.plan.create({
      data: {
        name: dto.name,
        planType,
        analysisProviderId: BigInt(providerIds[0]),
        analysisProviderIds: providerIds,
        analysisLimit: dto.analysisLimit,
        analysisLimits: dto.analysisLimits ?? {},
        price: dto.price,
        durationDays: dto.durationDays,
        maxUsers: isIndividual ? 1 : dto.maxUsers,
        modules: isIndividual ? [] : (dto.modules ?? []),
        roleLimits: isIndividual ? {} : (dto.roleLimits ?? {}),
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
      include: { provider: true },
    });
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

    return this.prisma.plan.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        planType: dto.planType,
        analysisProviderId: BigInt(providerIds[0]),
        analysisProviderIds: providerIds,
        analysisLimit: dto.analysisLimit,
        analysisLimits: dto.analysisLimits,
        price: dto.price,
        durationDays: dto.durationDays,
        maxUsers: isIndividual ? 1 : dto.maxUsers,
        modules: isIndividual ? [] : dto.modules,
        roleLimits: isIndividual ? {} : dto.roleLimits,
        isActive: dto.isActive,
        description: dto.description,
      },
      include: { provider: true },
    });
  }

  remove(id: string) {
    return this.prisma.plan.delete({ where: { id: BigInt(id) } });
  }
}
