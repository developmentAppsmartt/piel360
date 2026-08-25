import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSpecialtyDto } from './dto/create-specialty.dto';
import type { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(row: {
    id: bigint;
    name: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id.toString(),
      name: row.name,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Catálogo activo para formularios de registro / perfil. */
  async listActive() {
    const rows = await this.prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async listAll() {
    const rows = await this.prisma.specialty.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(dto: CreateSpecialtyDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.specialty.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('Ya existe una especialidad con ese nombre');
    }

    const maxOrder = await this.prisma.specialty.aggregate({
      _max: { sortOrder: true },
    });
    const row = await this.prisma.specialty.create({
      data: {
        name,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        isActive: dto.isActive ?? true,
      },
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateSpecialtyDto) {
    const current = await this.prisma.specialty.findUnique({
      where: { id: BigInt(id) },
    });
    if (!current) throw new NotFoundException('Especialidad no encontrada');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.specialty.findFirst({
        where: { name, id: { not: current.id } },
      });
      if (clash) {
        throw new ConflictException('Ya existe una especialidad con ese nombre');
      }
    }

    const row = await this.prisma.specialty.update({
      where: { id: current.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.serialize(row);
  }

  async remove(id: string) {
    const current = await this.prisma.specialty.findUnique({
      where: { id: BigInt(id) },
    });
    if (!current) throw new NotFoundException('Especialidad no encontrada');
    await this.prisma.specialty.delete({ where: { id: current.id } });
    return { ok: true };
  }
}
