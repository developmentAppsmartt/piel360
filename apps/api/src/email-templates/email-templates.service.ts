import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import type {
  CreateEmailTemplateDto,
  CreateEmailTemplateVariableDto,
  UpdateEmailTemplateDto,
  UpdateEmailTemplateVariableDto,
} from './dto/email-template.dto';
import {
  EMAIL_TEMPLATE_KIND_LABELS,
} from './email-templates.defaults';

type TemplateRow = {
  id: bigint;
  doctorId: bigint;
  kind: string;
  name: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_BODY_HTML = `<p style="margin:0 0 12px;font-size:16px;">Hola {nombre},</p>
<p style="margin:0;line-height:1.55;font-size:15px;">Escribe aquí el contenido de tu correo.</p>`;

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

function slugifyKind(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return base || 'plantilla';
}

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
  ) {}

  private async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.assertTeamPermissionForUser(
      userId,
      'billing',
    );
    return ctx.catalogDoctorId;
  }

  private serialize(row: TemplateRow) {
    return {
      id: row.id.toString(),
      doctorId: row.doctorId.toString(),
      kind: row.kind,
      kindLabel: EMAIL_TEMPLATE_KIND_LABELS[row.kind] ?? row.name,
      name: row.name,
      subject: row.subject,
      preheader: row.preheader,
      bodyHtml: row.bodyHtml,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private serializeVariable(row: {
    id: bigint;
    doctorId: bigint;
    key: string;
    description: string;
    sampleValue: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id.toString(),
      doctorId: row.doctorId.toString(),
      key: row.key,
      description: row.description,
      sampleValue: row.sampleValue,
      isSystem: false as const,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureOwner(id: bigint, doctorId: bigint) {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Plantilla no encontrada');
    if (row.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta plantilla');
    }
    return row;
  }

  private async ensureVariableOwner(id: bigint, doctorId: bigint) {
    const row = await this.prisma.emailTemplateVariable.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Variable no encontrada');
    if (row.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta variable');
    }
    return row;
  }

  private async listMergedVariables(doctorId: bigint) {
    const custom = await this.prisma.emailTemplateVariable.findMany({
      where: { doctorId },
      orderBy: [{ key: 'asc' }],
    });
    return custom.map((row) => ({
      id: row.id.toString(),
      key: row.key,
      description: row.description,
      sampleValue: row.sampleValue,
      isSystem: false as const,
    }));
  }

  async meta(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    return {
      kinds: Object.entries(EMAIL_TEMPLATE_KIND_LABELS).map(([id, label]) => ({
        id,
        label,
      })),
      variables: await this.listMergedVariables(doctorId),
      integrations: {
        google: {
          connected: false,
          status: 'pending_setup',
          message:
            'Conexión con Google Workspace / Gmail pendiente. Disponible cuando completes la configuración OAuth.',
        },
        mailProvider: {
          connected: false,
          provider: null as string | null,
          status: 'pending_setup',
          message:
            'Proveedor de correo (Resend / SMTP) no configurado aún para envíos desde plantillas personalizadas.',
        },
      },
    };
  }

  async listVariables(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    return this.listMergedVariables(doctorId);
  }

  async createVariable(userId: string, dto: CreateEmailTemplateVariableDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const key = normalizeVariableKey(dto.key);
    const existing = await this.prisma.emailTemplateVariable.findUnique({
      where: { doctorId_key: { doctorId, key } },
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

  async updateVariable(
    userId: string,
    id: string,
    dto: UpdateEmailTemplateVariableDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
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

  async deleteVariable(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureVariableOwner(BigInt(id), doctorId);
    await this.prisma.emailTemplateVariable.delete({
      where: { id: BigInt(id) },
    });
    return { ok: true };
  }

  async list(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const rows = await this.prisma.emailTemplate.findMany({
      where: { doctorId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.serialize(row));
  }

  async getOne(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const row = await this.ensureOwner(BigInt(id), doctorId);
    return this.serialize(row);
  }

  async create(userId: string, dto: CreateEmailTemplateDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const name = dto.name.trim();
    const kindBase = slugifyKind(dto.kind?.trim() || name);
    const kind = `${kindBase}_${Date.now().toString(36)}`;

    const row = await this.prisma.emailTemplate.create({
      data: {
        doctorId,
        kind,
        name,
        subject: dto.subject.trim(),
        preheader: dto.preheader?.trim() || null,
        bodyHtml: dto.bodyHtml?.trim() || EMPTY_BODY_HTML,
        isActive: dto.isActive ?? true,
      },
    });
    return this.serialize(row);
  }

  async update(userId: string, id: string, dto: UpdateEmailTemplateDto) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureOwner(BigInt(id), doctorId);

    const row = await this.prisma.emailTemplate.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.subject != null ? { subject: dto.subject.trim() } : {}),
        ...(dto.preheader !== undefined
          ? { preheader: dto.preheader?.trim() || null }
          : {}),
        ...(dto.bodyHtml != null ? { bodyHtml: dto.bodyHtml } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
    return this.serialize(row);
  }

  async remove(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureOwner(BigInt(id), doctorId);
    await this.prisma.emailTemplate.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }

  async uploadBanner(userId: string, file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta la imagen del banner');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    const doctorId = await this.catalogDoctorId(userId);
    const ext =
      extname(file.originalname).replace('.', '').toLowerCase() ||
      file.mimetype.split('/')[1] ||
      'jpg';
    const key = `email-templates/${doctorId}/banners/${randomUUID()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    // Máx. 7 días (límite SigV4). La vista previa usa esta URL; el envío
    // real debería regenerar la firma o servir por CDN público.
    const url = await this.storage.getSignedUrl(key, 60 * 60 * 24 * 7);
    return { key, url };
  }
}
