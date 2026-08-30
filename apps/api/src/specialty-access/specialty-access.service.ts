import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ANALYSIS_PROVIDER_SLUGS,
  PROVIDER_USAGE_PERMISSIONS,
  type AnalysisProviderSlug,
  providerSlugFromUsagePermission,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SpecialtiesService } from '../specialties/specialties.service';

export type SpecialtyPlanPermissionRow = {
  roleId: string;
  roleSlug: string;
  label: string;
  providers: Record<AnalysisProviderSlug, boolean>;
};

@Injectable()
export class SpecialtyAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly specialtiesService: SpecialtiesService,
  ) {}

  providerPermissionName(slug: AnalysisProviderSlug): string {
    return PROVIDER_USAGE_PERMISSIONS[slug];
  }

  async getAllowedProviderSlugs(userId: bigint): Promise<AnalysisProviderSlug[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { permissions: true } },
      },
    });
    if (!user) return [];

    const allowed = new Set<AnalysisProviderSlug>();
    for (const role of user.roles) {
      for (const permission of role.permissions) {
        const slug = providerSlugFromUsagePermission(permission.name);
        if (slug) allowed.add(slug);
      }
    }
    return ANALYSIS_PROVIDER_SLUGS.filter((slug) => allowed.has(slug));
  }

  async assertCanUseProvider(
    userId: bigint,
    providerSlug: AnalysisProviderSlug,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { permissions: true } } },
    });
    if (user?.roles.some((role) => role.name === 'superadmin')) return;

    const allowed = new Set<AnalysisProviderSlug>();
    for (const role of user?.roles ?? []) {
      for (const permission of role.permissions) {
        const slug = providerSlugFromUsagePermission(permission.name);
        if (slug) allowed.add(slug);
      }
    }
    if (!allowed.has(providerSlug)) {
      throw new ForbiddenException(
        'Tu especialidad no tiene permiso para este tipo de análisis. Contacta al administrador.',
      );
    }
  }

  async assignSpecialtyRole(
    userId: bigint,
    specialtyLabel: string | null | undefined,
  ): Promise<void> {
    const specialty = await this.specialtiesService.findByName(specialtyLabel);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { specialty: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentSpecialtyRoles = user.roles
      .filter((role) => role.specialty)
      .map((role) => role.name);

    const nextSlug = specialty?.slug ?? null;
    const disconnect = currentSpecialtyRoles
      .filter((slug) => slug !== nextSlug)
      .map((name) => ({ name }));

    const connect = nextSlug ? [{ name: nextSlug }] : [];

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          disconnect,
          connect,
        },
      },
    });
  }

  async getSpecialtyPlanMatrix(): Promise<SpecialtyPlanPermissionRow[]> {
    const specialties = await this.prisma.doctorSpecialty.findMany({
      include: {
        role: { include: { permissions: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return specialties.map((specialty) => {
      const permissionNames = new Set(
        specialty.role.permissions.map((p) => p.name),
      );
      const providers = Object.fromEntries(
        ANALYSIS_PROVIDER_SLUGS.map((slug) => [
          slug,
          permissionNames.has(this.providerPermissionName(slug)),
        ]),
      ) as Record<AnalysisProviderSlug, boolean>;

      return {
        roleId: specialty.roleId.toString(),
        roleSlug: specialty.slug,
        label: specialty.name,
        providers,
      };
    });
  }

  async updateSpecialtyPlanPermissions(
    roleId: string,
    providers: Partial<Record<AnalysisProviderSlug, boolean>>,
  ): Promise<SpecialtyPlanPermissionRow> {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
      include: { permissions: true, specialty: true },
    });
    if (!role?.specialty) {
      throw new NotFoundException('Rol de especialidad no encontrado');
    }

    const connect: { name: string }[] = [];
    const disconnect: { name: string }[] = [];

    for (const slug of ANALYSIS_PROVIDER_SLUGS) {
      if (providers[slug] === undefined) continue;
      const perm = this.providerPermissionName(slug);
      if (providers[slug]) connect.push({ name: perm });
      else disconnect.push({ name: perm });
    }

    await this.prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          connect,
          disconnect,
        },
      },
    });

    const matrix = await this.getSpecialtyPlanMatrix();
    const row = matrix.find((r) => r.roleSlug === role.specialty!.slug);
    if (!row) {
      throw new NotFoundException('No se pudo actualizar el rol de especialidad');
    }
    return row;
  }

  async backfillDoctorSpecialtyRoles(): Promise<void> {
    const doctors = await this.prisma.doctor.findMany({
      select: { userId: true, specialty: true },
    });
    for (const doctor of doctors) {
      await this.assignSpecialtyRole(doctor.userId, doctor.specialty);
    }
  }
}
