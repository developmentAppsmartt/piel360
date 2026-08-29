import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSpecialtyDto } from './dto/create-specialty.dto';
import type { UpdateSpecialtyDto } from './dto/update-specialty.dto';

export type SpecialtyDto = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  roleId: string;
  doctorCount: number;
};

type SpecialtyWithRole = Prisma.DoctorSpecialtyGetPayload<{
  include: { role: true };
}>;

@Injectable()
export class SpecialtiesService {
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

  private serialize(
    specialty: SpecialtyWithRole,
    doctorCount = 0,
  ): SpecialtyDto {
    return {
      id: specialty.id.toString(),
      name: specialty.name,
      slug: specialty.slug,
      sortOrder: specialty.sortOrder,
      isActive: specialty.isActive,
      roleId: specialty.roleId.toString(),
      doctorCount,
    };
  }

  private async doctorCountsByName(
    names: string[],
  ): Promise<Map<string, number>> {
    if (names.length === 0) return new Map();
    const rows = await this.prisma.doctor.groupBy({
      by: ['specialty'],
      where: { specialty: { in: names } },
      _count: { specialty: true },
    });
    return new Map(
      rows
        .filter((row) => row.specialty)
        .map((row) => [row.specialty as string, row._count.specialty]),
    );
  }

  async findActive(): Promise<SpecialtyDto[]> {
    const specialties = await this.prisma.doctorSpecialty.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return specialties.map((specialty) => this.serialize(specialty));
  }

  async findAll(): Promise<SpecialtyDto[]> {
    const specialties = await this.prisma.doctorSpecialty.findMany({
      include: { role: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.doctorCountsByName(
      specialties.map((specialty) => specialty.name),
    );
    return specialties.map((specialty) =>
      this.serialize(specialty, counts.get(specialty.name) ?? 0),
    );
  }

  async findByName(name: string | null | undefined) {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    return this.prisma.doctorSpecialty.findFirst({
      where: { name: trimmed, isActive: true },
      include: { role: true },
    });
  }

  async resolveRoleSlugByLabel(
    label: string | null | undefined,
  ): Promise<string | null> {
    const specialty = await this.findByName(label);
    return specialty?.slug ?? null;
  }

  async create(dto: CreateSpecialtyDto): Promise<SpecialtyDto> {
    const name = dto.name.trim();
    const slug = (dto.slug?.trim() || this.slugifyName(name)).toLowerCase();
    if (!slug) {
      throw new BadRequestException('No se pudo generar un slug válido');
    }

    const existingName = await this.prisma.doctorSpecialty.findUnique({
      where: { name },
    });
    if (existingName) {
      throw new ConflictException('Ya existe una especialidad con ese nombre');
    }

    const existingSlug = await this.prisma.doctorSpecialty.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('Ya existe una especialidad con ese slug');
    }

    const roleConflict = await this.prisma.role.findUnique({ where: { name: slug } });
    if (roleConflict) {
      throw new ConflictException('Ya existe un rol con ese slug');
    }

    const maxSort = await this.prisma.doctorSpecialty.aggregate({
      _max: { sortOrder: true },
    });

    const specialty = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: { name: slug } });
      return tx.doctorSpecialty.create({
        data: {
          name,
          slug,
          sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
          isActive: dto.isActive ?? true,
          roleId: role.id,
        },
        include: { role: true },
      });
    });

    return this.serialize(specialty, 0);
  }

  async update(id: string, dto: UpdateSpecialtyDto): Promise<SpecialtyDto> {
    const specialty = await this.prisma.doctorSpecialty.findUnique({
      where: { id: BigInt(id) },
      include: { role: true },
    });
    if (!specialty) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    const nextName = dto.name?.trim();
    const nextSlug = dto.slug?.trim().toLowerCase();

    if (nextName && nextName !== specialty.name) {
      const conflict = await this.prisma.doctorSpecialty.findUnique({
        where: { name: nextName },
      });
      if (conflict && conflict.id !== specialty.id) {
        throw new ConflictException('Ya existe una especialidad con ese nombre');
      }
    }

    if (nextSlug && nextSlug !== specialty.slug) {
      const conflict = await this.prisma.doctorSpecialty.findUnique({
        where: { slug: nextSlug },
      });
      if (conflict && conflict.id !== specialty.id) {
        throw new ConflictException('Ya existe una especialidad con ese slug');
      }
      const roleConflict = await this.prisma.role.findFirst({
        where: { name: nextSlug, id: { not: specialty.roleId } },
      });
      if (roleConflict) {
        throw new ConflictException('Ya existe un rol con ese slug');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (nextSlug && nextSlug !== specialty.slug) {
        await tx.role.update({
          where: { id: specialty.roleId },
          data: { name: nextSlug },
        });
      }

      if (nextName && nextName !== specialty.name) {
        await tx.doctor.updateMany({
          where: { specialty: specialty.name },
          data: { specialty: nextName },
        });
      }

      return tx.doctorSpecialty.update({
        where: { id: specialty.id },
        data: {
          ...(nextName ? { name: nextName } : {}),
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { role: true },
      });
    });

    const doctorCount = await this.prisma.doctor.count({
      where: { specialty: updated.name },
    });
    return this.serialize(updated, doctorCount);
  }

  async remove(id: string): Promise<void> {
    const specialty = await this.prisma.doctorSpecialty.findUnique({
      where: { id: BigInt(id) },
      include: { role: true },
    });
    if (!specialty) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    const doctorCount = await this.prisma.doctor.count({
      where: { specialty: specialty.name },
    });
    if (doctorCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: ${doctorCount} doctor(es) usan esta especialidad`,
      );
    }

    await this.prisma.doctorSpecialty.delete({ where: { id: specialty.id } });
  }
}
