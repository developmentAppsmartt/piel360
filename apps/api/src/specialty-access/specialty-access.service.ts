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
  kind: 'specialty' | 'labor_technician';
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

  private providersFromRolePermissions(
    permissionNames: Set<string>,
  ): Record<AnalysisProviderSlug, boolean> {
    return Object.fromEntries(
      ANALYSIS_PROVIDER_SLUGS.map((slug) => [
        slug,
        permissionNames.has(this.providerPermissionName(slug)),
      ]),
    ) as Record<AnalysisProviderSlug, boolean>;
  }

  async resolveProfessionalRoleSlug(
    label: string | null | undefined,
  ): Promise<string | null> {
    const specialty = await this.specialtiesService.findByName(label);
    if (specialty) return specialty.slug;

    const trimmed = label?.trim();
    if (!trimmed) return null;

    const labor = await this.prisma.laborTechnicianProfile.findFirst({
      where: { name: trimmed, isActive: true },
    });
    return labor?.slug ?? null;
  }

  async assertProfessionalRoleSlug(
    label: string | null | undefined,
  ): Promise<string> {
    const trimmed = label?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Selecciona una especialidad médica o un perfil de técnico laboral.',
      );
    }

    const specialty = await this.specialtiesService.findByName(trimmed);
    if (specialty) {
      const role = await this.prisma.role.findUnique({
        where: { name: specialty.slug },
      });
      if (!role) {
        throw new BadRequestException(
          'La especialidad seleccionada no está configurada. Contacta al administrador.',
        );
      }
      return specialty.slug;
    }

    const labor = await this.prisma.laborTechnicianProfile.findFirst({
      where: { name: trimmed, isActive: true },
      include: { role: true },
    });
    if (!labor) {
      throw new BadRequestException(
        'Especialidad médica o perfil de técnico laboral no válido.',
      );
    }
    if (!labor.role) {
      throw new BadRequestException(
        'El perfil de técnico laboral no está configurado. Contacta al administrador.',
      );
    }
    return labor.slug;
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
        'Tu especialidad o perfil técnico no tiene permiso para este tipo de análisis. Contacta al administrador.',
      );
    }
  }

  async assignSpecialtyRole(
    userId: bigint,
    specialtyLabel: string | null | undefined,
  ): Promise<void> {
    const nextSlug = await this.resolveProfessionalRoleSlug(specialtyLabel);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { specialty: true, laborTechnicianProfile: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentProfessionalRoles = user.roles
      .filter((role) => role.specialty || role.laborTechnicianProfile)
      .map((role) => role.name);

    const disconnect = currentProfessionalRoles
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
    const [specialties, laborProfiles] = await Promise.all([
      this.prisma.doctorSpecialty.findMany({
        include: {
          role: { include: { permissions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.laborTechnicianProfile.findMany({
        include: {
          role: { include: { permissions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const specialtyRows = specialties
      .filter(
        (specialty): specialty is typeof specialty & { role: NonNullable<typeof specialty.role> } =>
          specialty.role != null,
      )
      .map((specialty) => {
        const permissionNames = new Set(
          specialty.role.permissions.map((p) => p.name),
        );
        return {
          roleId: specialty.role.id.toString(),
          roleSlug: specialty.slug,
          label: specialty.name,
          kind: 'specialty' as const,
          providers: this.providersFromRolePermissions(permissionNames),
        };
      });

    const laborRows = laborProfiles
      .filter(
        (profile): profile is typeof profile & { role: NonNullable<typeof profile.role> } =>
          profile.role != null,
      )
      .map((profile) => {
        const permissionNames = new Set(
          profile.role.permissions.map((p) => p.name),
        );
        return {
          roleId: profile.role.id.toString(),
          roleSlug: profile.slug,
          label: profile.name,
          kind: 'labor_technician' as const,
          providers: this.providersFromRolePermissions(permissionNames),
        };
      });

    return [...specialtyRows, ...laborRows];
  }

  async updateSpecialtyPlanPermissions(
    roleId: string,
    providers: Partial<Record<AnalysisProviderSlug, boolean>>,
  ): Promise<SpecialtyPlanPermissionRow> {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
      include: {
        permissions: true,
        specialty: true,
        laborTechnicianProfile: true,
      },
    });
    if (!role?.specialty && !role?.laborTechnicianProfile) {
      throw new NotFoundException(
        'Rol de especialidad o técnico laboral no encontrado',
      );
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
    const row = matrix.find((r) => r.roleId === roleId);
    if (!row) {
      throw new NotFoundException('No se pudo actualizar el rol profesional');
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
