import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SYSTEM_EMAIL_VARIABLES } from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateEmailTemplateVariableDto,
  UpdateEmailTemplateVariableDto,
} from './dto/email-template.dto';
import { templateScopeDoctorId } from './email-template-scope';

function normalizeVariableKey(raw: string): string {
  let key = raw.trim().toLowerCase();
  key = key.replace(/^\{|\}$/g, '');
  key = key
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!key) {
    throw new BadRequestException('La clave de la variable no es válida');
  }
  return `{${key}}`;
}

/** Variables personalizadas de las plantillas (además de las del sistema). */
@Injectable()
export class EmailTemplateVariablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  private serializeVariable(row: {
    id: bigint;
    doctorId: bigint | null;
    key: string;
    description: string;
    sampleValue: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id.toString(),
      doctorId: row.doctorId?.toString() ?? null,
      key: row.key,
      description: row.description,
      sampleValue: row.sampleValue,
      isSystem: false as const,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureVariableOwner(id: bigint, doctorId: bigint | null) {
    const row = await this.prisma.emailTemplateVariable.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Variable no encontrada');
    if (row.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta variable');
    }
    return row;
  }

  /** Las del sistema primero y luego las del doctor (o de plataforma). */
  async listMerged(doctorId: bigint | null) {
    const custom = await this.prisma.emailTemplateVariable.findMany({
      where: { doctorId },
      orderBy: [{ key: 'asc' }],
    });
    const system = SYSTEM_EMAIL_VARIABLES.map((v) => ({
      id: null as string | null,
      key: v.key,
      description: v.description,
      sampleValue: v.sampleValue,
      isSystem: true as const,
    }));
    return [
      ...system,
      ...custom.map((row) => ({
        id: row.id.toString(),
        key: row.key,
        description: row.description,
        sampleValue: row.sampleValue,
        isSystem: false as const,
      })),
    ];
  }

  async list(user: JwtPayload) {
    return this.listMerged(await templateScopeDoctorId(this.orgContext, user));
  }

  async create(user: JwtPayload, dto: CreateEmailTemplateVariableDto) {
    const doctorId = await templateScopeDoctorId(this.orgContext, user);
    const key = normalizeVariableKey(dto.key);
    if (SYSTEM_EMAIL_VARIABLES.some((v) => v.key === key)) {
      throw new ConflictException(
        `«${key}» es una variable del sistema — no se puede redefinir`,
      );
    }
    // findFirst y no findUnique: el índice `(doctor_id, key)` no sirve de
    // nada cuando `doctor_id` es NULL, porque en Postgres dos NULL no chocan.
    const existing = await this.prisma.emailTemplateVariable.findFirst({
      where: { doctorId, key },
    });
    if (existing) {
      throw new ConflictException(`Ya existe la variable «${key}»`);
    }

    const row = await this.prisma.emailTemplateVariable.create({
      data: {
        doctorId,
        key,
        description: dto.description.trim(),
        sampleValue: dto.sampleValue?.trim() || null,
      },
    });
    return this.serializeVariable(row);
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateEmailTemplateVariableDto,
  ) {
    const doctorId = await templateScopeDoctorId(this.orgContext, user);
    await this.ensureVariableOwner(BigInt(id), doctorId);

    let nextKey: string | undefined;
    if (dto.key != null) {
      nextKey = normalizeVariableKey(dto.key);
      const clash = await this.prisma.emailTemplateVariable.findFirst({
        where: {
          doctorId,
          key: nextKey,
          NOT: { id: BigInt(id) },
        },
      });
      if (clash) {
        throw new ConflictException(`Ya existe la variable «${nextKey}»`);
      }
    }

    const row = await this.prisma.emailTemplateVariable.update({
      where: { id: BigInt(id) },
      data: {
        ...(nextKey != null ? { key: nextKey } : {}),
        ...(dto.description != null
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.sampleValue !== undefined
          ? { sampleValue: dto.sampleValue?.trim() || null }
          : {}),
      },
    });
    return this.serializeVariable(row);
  }

  async remove(user: JwtPayload, id: string) {
    const doctorId = await templateScopeDoctorId(this.orgContext, user);
    await this.ensureVariableOwner(BigInt(id), doctorId);
    await this.prisma.emailTemplateVariable.delete({
      where: { id: BigInt(id) },
    });
    return { ok: true };
  }
}
