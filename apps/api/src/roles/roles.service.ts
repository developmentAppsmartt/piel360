import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

const roleInclude = {
  permissions: true,
  specialtyLinks: { include: { doctorSpecialty: true } },
  laborTechnicianProfile: true,
  _count: { select: { users: true } },
} as const;

type RoleWithRelations = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  slugifyLabel(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  private serializeRole(role: RoleWithRelations) {
    return {
      ...role,
      id: role.id.toString(),
      laborTechnicianProfileId: role.laborTechnicianProfileId?.toString() ?? null,
      laborTechnicianProfile: role.laborTechnicianProfile
        ? {
            ...role.laborTechnicianProfile,
            id: role.laborTechnicianProfile.id.toString(),
          }
        : null,
      specialtyLinks: role.specialtyLinks.map((link) => ({
        doctorSpecialtyId: link.doctorSpecialtyId.toString(),
        doctorSpecialty: {
          ...link.doctorSpecialty,
          id: link.doctorSpecialty.id.toString(),
          roleId: link.doctorSpecialty.roleId.toString(),
        },
      })),
      permissions: role.permissions.map((permission) => ({
        ...permission,
        id: permission.id.toString(),
        slug: permission.slug,
        label: permission.label,
        isActive: permission.isActive,
        kind: permission.kind,
        panel: permission.panel,
      })),
    };
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: roleInclude,
      orderBy: { id: 'asc' },
    });
    return roles.map((role) => this.serializeRole(role));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id: BigInt(id) },
      include: roleInclude,
    });
    return this.serializeRole(role);
  }

  /** `GET /admin/permissions` — catálogo completo para armar la matriz de checkboxes. */
  async findPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [
        { kind: 'asc' },
        { panel: 'asc' },
        { sortOrder: 'asc' },
        { slug: 'asc' },
      ],
    });
    return permissions.map((permission) => ({
      id: permission.id.toString(),
      name: permission.name,
      slug: permission.slug,
      label: permission.label,
      description: permission.description,
      isActive: permission.isActive,
      kind: permission.kind,
      panel: permission.panel,
      href: permission.href,
      sortOrder: permission.sortOrder,
      parentSlug: permission.parentSlug,
    }));
  }

  async updatePermission(id: string, isActive: boolean) {
    const permission = await this.prisma.permission.update({
      where: { id: BigInt(id) },
      data: { isActive },
    });
    return {
      id: permission.id.toString(),
      slug: permission.slug,
      isActive: permission.isActive,
    };
  }

  private async resolveUniqueName(label: string, explicitName?: string) {
    const base = (explicitName?.trim() || this.slugifyLabel(label)).toLowerCase();
    if (!base) {
      throw new ConflictException('No se pudo generar un identificador válido para el rol');
    }

    let candidate = base;
    let suffix = 2;
    while (await this.prisma.role.findUnique({ where: { name: candidate } })) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateRoleDto) {
    const label = dto.label.trim();
    const name = await this.resolveUniqueName(label, dto.name);
    const permissionIds = dto.permissionIds ?? [];

    const role = await this.prisma.role.create({
      data: {
        name,
        label,
        description: dto.description?.trim() || null,
        color: dto.color?.trim() || '#6C4FFB',
        isActive: dto.isActive ?? true,
        laborTechnicianProfileId: dto.laborTechnicianProfileId
          ? BigInt(dto.laborTechnicianProfileId)
          : undefined,
        permissions: {
          connect: permissionIds.map((id) => ({ id: BigInt(id) })),
        },
        specialtyLinks: dto.specialtyIds?.length
          ? {
              create: dto.specialtyIds.map((specialtyId) => ({
                doctorSpecialtyId: BigInt(specialtyId),
              })),
            }
          : undefined,
      },
      include: roleInclude,
    });

    return this.serializeRole(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUniqueOrThrow({
      where: { id: BigInt(id) },
    });

    const nextLabel = dto.label?.trim();
    const nextName = dto.name?.trim();

    if (nextName && nextName !== existing.name) {
      const conflict = await this.prisma.role.findUnique({ where: { name: nextName } });
      if (conflict && conflict.id !== existing.id) {
        throw new ConflictException('Ya existe un rol con ese identificador');
      }
    }

    const role = await this.prisma.$transaction(async (tx) => {
      if (dto.specialtyIds !== undefined) {
        await tx.roleSpecialtyLink.deleteMany({ where: { roleId: existing.id } });
        if (dto.specialtyIds.length > 0) {
          await tx.roleSpecialtyLink.createMany({
            data: dto.specialtyIds.map((specialtyId) => ({
              roleId: existing.id,
              doctorSpecialtyId: BigInt(specialtyId),
            })),
          });
        }
      }

      return tx.role.update({
        where: { id: existing.id },
        data: {
          ...(nextName ? { name: nextName } : {}),
          ...(nextLabel ? { label: nextLabel } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
          ...(dto.color !== undefined ? { color: dto.color.trim() || '#6C4FFB' } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.laborTechnicianProfileId !== undefined
            ? {
                laborTechnicianProfileId: dto.laborTechnicianProfileId
                  ? BigInt(dto.laborTechnicianProfileId)
                  : null,
              }
            : {}),
          ...(dto.permissionIds !== undefined
            ? {
                permissions: {
                  set: dto.permissionIds.map((permId) => ({ id: BigInt(permId) })),
                },
              }
            : {}),
        },
        include: roleInclude,
      });
    });

    return this.serializeRole(role);
  }

  remove(id: string) {
    return this.prisma.role.delete({ where: { id: BigInt(id) } });
  }
}
