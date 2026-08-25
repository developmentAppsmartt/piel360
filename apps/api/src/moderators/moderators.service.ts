import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  DEFAULT_MODERATOR_PERMISSIONS,
  MODERATOR_PERMISSIONS,
  type ModeratorPermission,
} from '@piel360/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateModeratorDto } from './dto/create-moderator.dto';

function parsePermissions(raw: unknown): ModeratorPermission[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_MODERATOR_PERMISSIONS];
  }
  const allowed = new Set<string>(MODERATOR_PERMISSIONS);
  return raw.filter((p): p is ModeratorPermission =>
    typeof p === 'string' && allowed.has(p),
  );
}

@Injectable()
export class ModeratorsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(moderator: {
    id: bigint;
    userId: bigint;
    firstName: string;
    lastName: string;
    docType: string | null;
    docNumber: string | null;
    phone: string | null;
    permissions: unknown;
    createdAt: Date;
    updatedAt: Date;
    user: { email: string; createdAt: Date };
  }) {
    return {
      id: moderator.id.toString(),
      userId: moderator.userId.toString(),
      firstName: moderator.firstName,
      lastName: moderator.lastName,
      docType: moderator.docType,
      docNumber: moderator.docNumber,
      phone: moderator.phone,
      permissions: parsePermissions(moderator.permissions),
      createdAt: moderator.createdAt.toISOString(),
      updatedAt: moderator.updatedAt.toISOString(),
      user: {
        email: moderator.user.email,
        createdAt: moderator.user.createdAt.toISOString(),
      },
    };
  }

  async findAll() {
    const rows = await this.prisma.moderator.findMany({
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { id: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const moderator = await this.prisma.moderator.findUnique({
      where: { id: BigInt(id) },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    if (!moderator) throw new NotFoundException('Moderador no encontrado');
    return this.serialize(moderator);
  }

  async create(dto: CreateModeratorDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const password = await argon2.hash(dto.password);
    const phone = dto.phone?.trim() || null;
    const permissions = [...DEFAULT_MODERATOR_PERMISSIONS];

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        name: `${dto.firstName} ${dto.lastName}`.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone,
        roles: { connect: { name: 'monitor' } },
        moderator: {
          create: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            docType: dto.docType?.trim() || null,
            docNumber: dto.docNumber?.trim() || null,
            phone,
            permissions: permissions as unknown as Prisma.InputJsonValue,
          },
        },
      },
    });

    const moderator = await this.prisma.moderator.findUniqueOrThrow({
      where: { userId: user.id },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    return this.serialize(moderator);
  }

  async updatePermissions(id: string, permissions: ModeratorPermission[]) {
    const current = await this.prisma.moderator.findUnique({
      where: { id: BigInt(id) },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    if (!current) throw new NotFoundException('Moderador no encontrado');

    const updated = await this.prisma.moderator.update({
      where: { id: current.id },
      data: {
        permissions: permissions as unknown as Prisma.InputJsonValue,
      },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    return this.serialize(updated);
  }

  async remove(id: string) {
    const moderator = await this.prisma.moderator.findUnique({
      where: { id: BigInt(id) },
    });
    if (!moderator) throw new NotFoundException('Moderador no encontrado');
    await this.prisma.user.delete({ where: { id: moderator.userId } });
    return { ok: true };
  }
}
