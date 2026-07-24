import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { id: 'asc' },
    });
  }

  /** `GET /admin/permissions` — catálogo completo (54 = 9 recursos × 6
   * acciones, sembrados en seed.ts) para armar la matriz de checkboxes. */
  findPermissions() {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        permissions: {
          connect: dto.permissionIds.map((id) => ({ id: BigInt(id) })),
        },
      },
      include: { permissions: true, _count: { select: { users: true } } },
    });
  }

  /** `set` reemplaza la asociación completa — equivalente a `syncPermissions`
   * de Laravel/Filament Shield. */
  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        permissions: dto.permissionIds
          ? { set: dto.permissionIds.map((permId) => ({ id: BigInt(permId) })) }
          : undefined,
      },
      include: { permissions: true, _count: { select: { users: true } } },
    });
  }

  /** Relación muchos-a-muchos implícita con `User` — borrar un rol solo
   * quita la fila de la tabla puente, no afecta ni borra usuarios. */
  remove(id: string) {
    return this.prisma.role.delete({ where: { id: BigInt(id) } });
  }
}
