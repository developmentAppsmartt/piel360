import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateParameterDto,
  CreateParameterTypeDto,
  UpdateParameterDto,
} from './dto/parameter.dto';

type ParameterRow = {
  id: bigint;
  typeId: bigint;
  code: string | null;
  label: string;
  metadata: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ParameterTypeRow = {
  id: bigint;
  slug: string;
  name: string;
  createdAt: Date;
};

/**
 * Catálogo genérico de parámetros administrables (docs/catalogo) — un
 * ParameterType por catálogo (ej. "education_entity"), N Parameter por tipo.
 * Sin acoplamiento a RBAC (a diferencia de DoctorSpecialty/LaborTechnicianProfile,
 * que además crean un Role) — son listas de referencia inertes.
 */
@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeParameter(row: ParameterRow) {
    return {
      id: row.id.toString(),
      typeId: row.typeId.toString(),
      code: row.code,
      label: row.label,
      metadata: row.metadata,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private serializeType(row: ParameterTypeRow) {
    return {
      id: row.id.toString(),
      slug: row.slug,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async requireType(typeSlug: string) {
    const type = await this.prisma.parameterType.findUnique({
      where: { slug: typeSlug },
    });
    if (!type) {
      throw new NotFoundException(`No existe el catálogo «${typeSlug}»`);
    }
    return type;
  }

  // ─── Tipos de parámetro ─────────────────────────────────────────────────

  async listTypes() {
    const types = await this.prisma.parameterType.findMany({
      orderBy: { name: 'asc' },
    });
    return types.map((t) => this.serializeType(t));
  }

  async createType(dto: CreateParameterTypeDto) {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.prisma.parameterType.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Ya existe el catálogo «${slug}»`);
    }
    const type = await this.prisma.parameterType.create({
      data: { slug, name: dto.name.trim() },
    });
    return this.serializeType(type);
  }

  // ─── Parámetros ─────────────────────────────────────────────────────────

  /** Lista pública (sin guard) — usada por los combobox de los formularios
   * de registro, mismo criterio que `GET /specialties`. */
  async findActive(typeSlug: string) {
    const type = await this.requireType(typeSlug);
    const rows = await this.prisma.parameter.findMany({
      where: { typeId: type.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((r) => this.serializeParameter(r));
  }

  async findAll(typeSlug: string) {
    const type = await this.requireType(typeSlug);
    const rows = await this.prisma.parameter.findMany({
      where: { typeId: type.id },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((r) => this.serializeParameter(r));
  }

  async create(typeSlug: string, dto: CreateParameterDto) {
    const type = await this.requireType(typeSlug);
    const label = dto.label.trim();
    const existing = await this.prisma.parameter.findUnique({
      where: { typeId_label: { typeId: type.id, label } },
    });
    if (existing) {
      throw new ConflictException(`Ya existe «${label}» en este catálogo`);
    }
    const row = await this.prisma.parameter.create({
      data: {
        typeId: type.id,
        label,
        code: dto.code?.trim() || null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return this.serializeParameter(row);
  }

  private async ensureOwner(typeSlug: string, id: string) {
    const type = await this.requireType(typeSlug);
    const row = await this.prisma.parameter.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row || row.typeId !== type.id) {
      throw new NotFoundException('Parámetro no encontrado');
    }
    return row;
  }

  async update(typeSlug: string, id: string, dto: UpdateParameterDto) {
    const existing = await this.ensureOwner(typeSlug, id);

    if (dto.label != null) {
      const label = dto.label.trim();
      if (!label) {
        throw new BadRequestException('El texto no puede estar vacío');
      }
      const clash = await this.prisma.parameter.findFirst({
        where: { typeId: existing.typeId, label, NOT: { id: existing.id } },
      });
      if (clash) {
        throw new ConflictException(`Ya existe «${label}» en este catálogo`);
      }
    }

    const row = await this.prisma.parameter.update({
      where: { id: existing.id },
      data: {
        ...(dto.label != null ? { label: dto.label.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.serializeParameter(row);
  }

  async remove(typeSlug: string, id: string) {
    const existing = await this.ensureOwner(typeSlug, id);
    await this.prisma.parameter.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}
