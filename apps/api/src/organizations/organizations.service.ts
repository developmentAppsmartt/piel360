import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  type Role,
  type TeamMemberPermission,
} from '@piel360/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';
import type { AddTeamDoctorDto } from './dto/add-team-doctor.dto';

function isDoctorPanelRole(role: Role): boolean {
  return role === 'doctor' || role === 'superadmin';
}

function parsePermissions(raw: unknown): TeamMemberPermission[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is TeamMemberPermission => typeof p === 'string');
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
  ) {}

  private async requireMembership(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: BigInt(userId) },
      include: { organization: true },
    });
    if (!membership) {
      throw new NotFoundException('No tienes una organización asociada');
    }
    return membership;
  }

  private async requireOwnerOrg(userId: string) {
    const membership = await this.requireMembership(userId);
    if (membership.memberRole !== 'owner') {
      throw new ForbiddenException('Solo el dueño del equipo puede hacer esto');
    }
    return membership;
  }

  async getMine(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: BigInt(userId) },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    doctor: {
                      select: {
                        id: true,
                        specialty: true,
                        city: true,
                        lat: true,
                        lng: true,
                        membershipType: true,
                      },
                    },
                  },
                },
              },
            },
            referrals: {
              orderBy: { createdAt: 'desc' },
              include: {
                referredUser: {
                  select: { id: true, email: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('No tienes una organización asociada');
    }

    const org = membership.organization;
    return {
      id: org.id.toString(),
      type: org.type,
      name: org.name,
      seatPlan: org.seatPlan,
      seatLimit: org.seatLimit,
      seatUsed: org.members.length,
      referralCode: org.referralCode,
      status: org.status,
      memberRole: membership.memberRole,
      members: org.members.map((m) => ({
        id: m.id.toString(),
        memberRole: m.memberRole,
        userId: m.user.id.toString(),
        email: m.user.email,
        name: m.user.name,
        specialty: m.user.doctor?.specialty ?? null,
        city: m.user.doctor?.city ?? null,
        permissions: parsePermissions(m.permissions),
      })),
      referrals: org.referrals.map((r) => ({
        id: r.id.toString(),
        code: r.code,
        referredUser: r.referredUser
          ? {
              id: r.referredUser.id.toString(),
              email: r.referredUser.email,
              name: r.referredUser.name,
            }
          : null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /** Owner crea un doctor y lo añade al equipo (consume un asiento). */
  async addDoctor(ownerUserId: string, dto: AddTeamDoctorDto) {
    const membership = await this.requireOwnerOrg(ownerUserId);
    const org = membership.organization;

    const seatUsed = await this.prisma.organizationMember.count({
      where: { organizationId: org.id },
    });
    if (seatUsed >= org.seatLimit) {
      throw new BadRequestException(
        `No hay espacios disponibles (${seatUsed}/${org.seatLimit})`,
      );
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? dto.permissions
        : [...DEFAULT_TEAM_MEMBER_PERMISSIONS];

    const password = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        name: `${dto.firstName} ${dto.lastName}`.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone,
        roles: { connect: { name: 'doctor' } },
        doctor: {
          create: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone,
            specialty: dto.specialty?.trim() || null,
            membershipType: 'solo_doctor',
            empresa: false,
            empresaReferida: false,
            verificationStatus: 'pending',
          },
        },
        organizationMembers: {
          create: {
            organizationId: org.id,
            memberRole: 'member',
            permissions: permissions as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: {
        doctor: { select: { id: true, specialty: true } },
        organizationMembers: {
          where: { organizationId: org.id },
        },
      },
    });

    const member = user.organizationMembers[0];
    return {
      id: member.id.toString(),
      memberRole: member.memberRole,
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      specialty: user.doctor?.specialty ?? null,
      permissions: parsePermissions(member.permissions),
    };
  }

  async updateMemberPermissions(
    ownerUserId: string,
    memberId: string,
    permissions: TeamMemberPermission[],
  ) {
    const ownership = await this.requireOwnerOrg(ownerUserId);
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: BigInt(memberId),
        organizationId: ownership.organizationId,
      },
    });
    if (!member) {
      throw new NotFoundException('Miembro no encontrado en tu equipo');
    }
    if (member.memberRole === 'owner') {
      throw new BadRequestException(
        'No se pueden editar los permisos del dueño del equipo',
      );
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: {
        permissions: permissions as unknown as Prisma.InputJsonValue,
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return {
      id: updated.id.toString(),
      memberRole: updated.memberRole,
      email: updated.user.email,
      name: updated.user.name,
      permissions: parsePermissions(updated.permissions),
    };
  }

  /** Owner elimina un miembro del equipo y su cuenta de usuario. */
  async removeMember(ownerUserId: string, memberId: string) {
    const ownership = await this.requireOwnerOrg(ownerUserId);
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: BigInt(memberId),
        organizationId: ownership.organizationId,
      },
    });
    if (!member) {
      throw new NotFoundException('Miembro no encontrado en tu equipo');
    }
    if (member.memberRole === 'owner') {
      throw new BadRequestException(
        'No se puede eliminar al dueño del equipo',
      );
    }

    const userId = member.userId;
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.delete({ where: { id: member.id } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { ok: true };
  }

  async listAllForAdmin() {
    const orgs = await this.prisma.organization.findMany({
      include: {
        owner: { select: { id: true, email: true, name: true } },
        members: true,
        referrals: true,
      },
      orderBy: { id: 'asc' },
    });

    return orgs.map((org) => ({
      id: org.id.toString(),
      type: org.type,
      name: org.name,
      seatPlan: org.seatPlan,
      seatLimit: org.seatLimit,
      seatUsed: org.members.length,
      referralCode: org.referralCode,
      status: org.status,
      owner: {
        id: org.owner.id.toString(),
        email: org.owner.email,
        name: org.owner.name,
      },
      referralsCount: org.referrals.length,
    }));
  }

  async listReferralsForAdmin() {
    const rows = await this.prisma.referral.findMany({
      include: {
        organization: {
          select: { id: true, name: true, type: true, referralCode: true },
        },
        referredUser: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      createdAt: r.createdAt.toISOString(),
      organization: {
        id: r.organization.id.toString(),
        name: r.organization.name,
        type: r.organization.type,
        referralCode: r.organization.referralCode,
      },
      referredUser: r.referredUser
        ? {
            id: r.referredUser.id.toString(),
            email: r.referredUser.email,
            name: r.referredUser.name,
          }
        : null,
    }));
  }

  /** Marcadores de mapa scoped al doctor (equipo + pacientes propios). */
  async getMapMarkersForDoctor(
    userId: string,
    role: Role,
    kind?: 'doctor' | 'patient',
  ) {
    if (!isDoctorPanelRole(role) && role !== 'superadmin') {
      throw new ForbiddenException();
    }

    const doctor = await this.doctors.requireDoctorByUserId(userId);
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: BigInt(userId) },
      select: { organizationId: true },
    });

    let doctors: Array<{
      id: string;
      kind: 'doctor';
      name: string;
      specialty: string | null;
      city: string | null;
      lat: number;
      lng: number;
    }> = [];

    if (!kind || kind === 'doctor') {
      if (membership) {
        const members = await this.prisma.organizationMember.findMany({
          where: { organizationId: membership.organizationId },
          include: {
            user: {
              include: {
                doctor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    specialty: true,
                    city: true,
                    lat: true,
                    lng: true,
                  },
                },
              },
            },
          },
        });
        doctors = members
          .map((m) => m.user.doctor)
          .filter(
            (d): d is NonNullable<typeof d> =>
              d != null && d.lat != null && d.lng != null,
          )
          .map((d) => ({
            id: d.id.toString(),
            kind: 'doctor' as const,
            name: `${d.firstName} ${d.lastName}`.trim(),
            specialty: d.specialty,
            city: d.city,
            lat: Number(d.lat),
            lng: Number(d.lng),
          }));
      } else if (doctor.lat != null && doctor.lng != null) {
        doctors = [
          {
            id: doctor.id.toString(),
            kind: 'doctor',
            name: `${doctor.firstName} ${doctor.lastName}`.trim(),
            specialty: doctor.specialty,
            city: doctor.city,
            lat: Number(doctor.lat),
            lng: Number(doctor.lng),
          },
        ];
      }
    }

    let patients: Array<{
      id: string;
      kind: 'patient';
      name: string;
      city: string | null;
      lat: number;
      lng: number;
    }> = [];

    if (!kind || kind === 'patient') {
      const rows = await this.prisma.patient.findMany({
        where: {
          doctorId: doctor.id,
          lat: { not: null },
          lng: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address: true,
          lat: true,
          lng: true,
        },
      });
      patients = rows.map((p) => ({
        id: p.id.toString(),
        kind: 'patient' as const,
        name: `${p.firstName} ${p.lastName}`.trim(),
        city: p.address,
        lat: Number(p.lat),
        lng: Number(p.lng),
      }));
    }

    return { doctors, patients };
  }
}
