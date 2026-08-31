import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLaborTechnicianProfileDto } from './dto/create-labor-technician-profile.dto';
import type { UpdateLaborTechnicianProfileDto } from './dto/update-labor-technician-profile.dto';

export type LaborTechnicianProfileDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  roleId: string | null;
};

type ProfileWithRole = {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  role: { id: bigint } | null;
};

@Injectable()
export class LaborTechnicianProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  slugifyName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  private serialize(profile: ProfileWithRole): LaborTechnicianProfileDto {
    return {
      id: profile.id.toString(),
      name: profile.name,
      slug: profile.slug,
      description: profile.description,
      sortOrder: profile.sortOrder,
      isActive: profile.isActive,
      roleId: profile.role?.id.toString() ?? null,
    };
  }

  async findByName(name: string | null | undefined) {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    return this.prisma.laborTechnicianProfile.findFirst({
      where: { name: trimmed, isActive: true },
      include: { role: true },
    });
  }

  async findActive(): Promise<LaborTechnicianProfileDto[]> {
    const profiles = await this.prisma.laborTechnicianProfile.findMany({
      where: { isActive: true },
      include: { role: { select: { id: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return profiles.map((profile) => this.serialize(profile));
  }

  async findAll(): Promise<LaborTechnicianProfileDto[]> {
    const profiles = await this.prisma.laborTechnicianProfile.findMany({
      include: { role: { select: { id: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return profiles.map((profile) => this.serialize(profile));
  }

  async create(
    dto: CreateLaborTechnicianProfileDto,
  ): Promise<LaborTechnicianProfileDto> {
    const name = dto.name.trim();
    const slug = (dto.slug?.trim() || this.slugifyName(name)).toLowerCase();
    if (!slug) {
      throw new BadRequestException('No se pudo generar un slug válido');
    }

    const existingName = await this.prisma.laborTechnicianProfile.findUnique({
      where: { name },
    });
    if (existingName) {
      throw new ConflictException('Ya existe un perfil con ese nombre');
    }

    const existingSlug = await this.prisma.laborTechnicianProfile.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('Ya existe un perfil con ese slug');
    }

    const roleConflict = await this.prisma.role.findUnique({ where: { name: slug } });
    if (roleConflict) {
      throw new ConflictException('Ya existe un rol con ese slug');
    }

    const maxSort = await this.prisma.laborTechnicianProfile.aggregate({
      _max: { sortOrder: true },
    });

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.laborTechnicianProfile.create({
        data: {
          name,
          slug,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
          isActive: dto.isActive ?? true,
        },
      });

      await tx.role.create({
        data: {
          name: slug,
          laborTechnicianProfileId: created.id,
        },
      });

      return tx.laborTechnicianProfile.findUniqueOrThrow({
        where: { id: created.id },
        include: { role: { select: { id: true } } },
      });
    });

    return this.serialize(profile);
  }

  async update(
    id: string,
    dto: UpdateLaborTechnicianProfileDto,
  ): Promise<LaborTechnicianProfileDto> {
    const profile = await this.prisma.laborTechnicianProfile.findUnique({
      where: { id: BigInt(id) },
      include: { role: { select: { id: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Perfil de técnico laboral no encontrado');
    }

    const nextName = dto.name?.trim();
    const nextSlug = dto.slug?.trim().toLowerCase();

    if (nextName && nextName !== profile.name) {
      const conflict = await this.prisma.laborTechnicianProfile.findUnique({
        where: { name: nextName },
      });
      if (conflict && conflict.id !== profile.id) {
        throw new ConflictException('Ya existe un perfil con ese nombre');
      }
    }

    if (nextSlug && nextSlug !== profile.slug) {
      const conflict = await this.prisma.laborTechnicianProfile.findUnique({
        where: { slug: nextSlug },
      });
      if (conflict && conflict.id !== profile.id) {
        throw new ConflictException('Ya existe un perfil con ese slug');
      }
      const roleConflict = await this.prisma.role.findFirst({
        where: { name: nextSlug, id: { not: profile.role?.id } },
      });
      if (roleConflict) {
        throw new ConflictException('Ya existe un rol con ese slug');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (profile.role && nextSlug && nextSlug !== profile.slug) {
        await tx.role.update({
          where: { id: profile.role.id },
          data: { name: nextSlug },
        });
      }

      if (nextName && nextName !== profile.name) {
        await tx.doctor.updateMany({
          where: { specialty: profile.name },
          data: { specialty: nextName },
        });
      }

      return tx.laborTechnicianProfile.update({
        where: { id: profile.id },
        data: {
          ...(nextName ? { name: nextName } : {}),
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { role: { select: { id: true } } },
      });
    });

    return this.serialize(updated);
  }

  async remove(id: string): Promise<void> {
    const profile = await this.prisma.laborTechnicianProfile.findUnique({
      where: { id: BigInt(id) },
      include: { role: { select: { id: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Perfil de técnico laboral no encontrado');
    }

    const doctorCount = await this.prisma.doctor.count({
      where: { specialty: profile.name },
    });
    if (doctorCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: ${doctorCount} usuario(s) usan este perfil`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (profile.role) {
        await tx.role.delete({ where: { id: profile.role.id } });
      }
      await tx.laborTechnicianProfile.delete({ where: { id: profile.id } });
    });
  }
}
