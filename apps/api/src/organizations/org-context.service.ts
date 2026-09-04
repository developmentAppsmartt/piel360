import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  parseTeamMemberPermissions,
  TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';

export type OrgMemberRole = 'owner' | 'member';

export type OrgContext = {
  userId: bigint;
  doctorId: bigint;
  /** Doctor cuyo catálogo (productos/rutinas) usa este usuario. */
  catalogDoctorId: bigint;
  /** Usuario cuya suscripción y créditos de análisis aplican. */
  subscriptionUserId: bigint;
  organizationId: bigint | null;
  memberRole: OrgMemberRole | null;
  teamPermissions: TeamMemberPermission[];
  isOrgOwner: boolean;
  isOrgMember: boolean;
};

export type TeamProfessional = {
  userId: string;
  name: string;
  doctorId: string;
  memberRole: OrgMemberRole;
};

export type PatientDoctorScope = {
  ctx: OrgContext;
  /** Doctor IDs cuyos pacientes puede ver el usuario actual. */
  visibleDoctorIds: bigint[];
  professionals: TeamProfessional[];
};

@Injectable()
export class OrgContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
  ) {}

  async resolve(userId: string): Promise<OrgContext> {
    const doctor = await this.doctors.requireDoctorByUserId(userId);
    const userIdBig = BigInt(userId);

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: userIdBig },
      include: {
        organization: {
          include: {
            owner: {
              include: {
                doctor: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return {
        userId: userIdBig,
        doctorId: doctor.id,
        catalogDoctorId: doctor.id,
        subscriptionUserId: userIdBig,
        organizationId: null,
        memberRole: null,
        teamPermissions: [...TEAM_MEMBER_PERMISSIONS],
        isOrgOwner: false,
        isOrgMember: false,
      };
    }

    const org = membership.organization;
    const ownerDoctorId = org.owner.doctor?.id ?? doctor.id;

    if (membership.memberRole === 'owner') {
      return {
        userId: userIdBig,
        doctorId: doctor.id,
        catalogDoctorId: doctor.id,
        subscriptionUserId: userIdBig,
        organizationId: org.id,
        memberRole: 'owner',
        teamPermissions: [...TEAM_MEMBER_PERMISSIONS],
        isOrgOwner: true,
        isOrgMember: true,
      };
    }

    const parsed = parseTeamMemberPermissions(membership.permissions);
    // `null`/ausente → defaults legacy; `[]` explícito → sin módulos.
    const teamPermissions =
      membership.permissions == null
        ? [...DEFAULT_TEAM_MEMBER_PERMISSIONS]
        : parsed;

    return {
      userId: userIdBig,
      doctorId: doctor.id,
      catalogDoctorId: ownerDoctorId,
      subscriptionUserId: org.ownerUserId,
      organizationId: org.id,
      memberRole: 'member',
      teamPermissions,
      isOrgOwner: false,
      isOrgMember: true,
    };
  }

  assertTeamPermission(ctx: OrgContext, permission: TeamMemberPermission): void {
    if (!ctx.isOrgMember || ctx.isOrgOwner) return;
    if (!ctx.teamPermissions.includes(permission)) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este módulo del equipo',
      );
    }
  }

  async assertTeamPermissionForUser(
    userId: string,
    permission: TeamMemberPermission,
  ): Promise<OrgContext> {
    const ctx = await this.resolve(userId);
    this.assertTeamPermission(ctx, permission);
    return ctx;
  }

  /** Pacientes visibles: owner ve todo el equipo; miembro solo los suyos. */
  async resolvePatientDoctorScope(userId: string): Promise<PatientDoctorScope> {
    const ctx = await this.resolve(userId);

    if (!ctx.isOrgMember || !ctx.organizationId) {
      return {
        ctx,
        visibleDoctorIds: [ctx.doctorId],
        professionals: [],
      };
    }

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            doctor: { select: { id: true } },
          },
        },
      },
      orderBy: [{ memberRole: 'asc' }, { id: 'asc' }],
    });

    const visibleDoctorIds: bigint[] = [];
    const professionals: TeamProfessional[] = [];

    for (const member of members) {
      const doctorId = member.user.doctor?.id;
      if (!doctorId) continue;
      visibleDoctorIds.push(doctorId);
      professionals.push({
        userId: member.user.id.toString(),
        name: member.user.name,
        doctorId: doctorId.toString(),
        memberRole: member.memberRole as OrgMemberRole,
      });
    }

    if (ctx.isOrgOwner) {
      return { ctx, visibleDoctorIds, professionals };
    }

    return {
      ctx,
      visibleDoctorIds: [ctx.doctorId],
      professionals: [],
    };
  }

  async canAccessPatientDoctorId(
    userId: string,
    patientDoctorId: bigint | null,
  ): Promise<boolean> {
    if (patientDoctorId == null) return false;
    const scope = await this.resolvePatientDoctorScope(userId);
    return scope.visibleDoctorIds.some((id) => id === patientDoctorId);
  }
}
