import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { JwtPayload } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import {
  baseApiPublica,
  conBannersEstables,
  urlPublicaDeBanner,
} from './banner-urls';
import type {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';
import { EmailTemplateVariablesService } from './email-template-variables.service';
import { templateScopeDoctorId } from './email-template-scope';
import {
  APPOINTMENT_REMINDER_KIND,
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_KIND_LABELS,
  REMINDER_DEFAULT_DAYS,
} from './email-templates.defaults';

type TemplateRow = {
  id: bigint;
  doctorId: bigint | null;
  kind: string;
  name: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  daysBefore: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_BODY_HTML = `<p style="margin:0 0 12px;font-size:16px;">Hola {nombre},</p>
<p style="margin:0;line-height:1.55;font-size:15px;">Escribe aquí el contenido de tu correo.</p>`;

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

/** Los días de anticipación solo tienen sentido en el recordatorio de cita:
 * en cualquier otra plantilla se ignoran en vez de guardarse sin uso. */
function daysBeforeFor(kind: string, daysBefore: number | undefined) {
  if (daysBefore === undefined) return {};
  if (kind !== APPOINTMENT_REMINDER_KIND) {
    throw new BadRequestException(
      'Los días de anticipación solo aplican al recordatorio de cita',
    );
  }
  return { daysBefore };
}

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly variables: EmailTemplateVariablesService,
  ) {}

  private scopeDoctorId(user: JwtPayload) {
    return templateScopeDoctorId(this.orgContext, user);
  }

  private serialize(row: TemplateRow) {
    return {
      id: row.id.toString(),
      doctorId: row.doctorId?.toString() ?? null,
      kind: row.kind,
      kindLabel: EMAIL_TEMPLATE_KIND_LABELS[row.kind] ?? row.name,
      name: row.name,
      subject: row.subject,
      preheader: row.preheader,
      // Las plantillas guardadas antes llevan la URL firmada del banner, que
      // caduca a los 7 días: se le devuelve al editor ya reescrita.
      bodyHtml: conBannersEstables(row.bodyHtml, baseApiPublica(this.config)),
      daysBefore:
        row.kind === APPOINTMENT_REMINDER_KIND
          ? (row.daysBefore ?? REMINDER_DEFAULT_DAYS)
          : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureOwner(id: bigint, doctorId: bigint | null) {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Plantilla no encontrada');
    if (row.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta plantilla');
    }
    return row;
  }

  async meta(user: JwtPayload) {
    const doctorId = await this.scopeDoctorId(user);
    return {
      kinds: Object.entries(EMAIL_TEMPLATE_KIND_LABELS).map(([id, label]) => ({
        id,
        label,
      })),
      variables: await this.variables.listMerged(doctorId),
      integrations: {
        google: {
          connected: false,
          status: 'pending_setup',
          message:
            'Conexión con Google Workspace / Gmail pendiente. Disponible cuando completes la configuración OAuth.',
        },
        mailProvider: {
          connected: true,
          provider: 'brevo' as string | null,
          status: 'connected',
          message:
            'Correo transaccional vía Brevo. La plantilla "report_ready" activa se usa al completarse un análisis de estético.',
        },
      },
    };
  }

  async list(user: JwtPayload) {
    const doctorId = await this.scopeDoctorId(user);
    const rows = await this.prisma.emailTemplate.findMany({
      where: { doctorId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.serialize(row));
  }

  async getOne(user: JwtPayload, id: string) {
    const doctorId = await this.scopeDoctorId(user);
    const row = await this.ensureOwner(BigInt(id), doctorId);
    return this.serialize(row);
  }

  async create(user: JwtPayload, dto: CreateEmailTemplateDto) {
    const doctorId = await this.scopeDoctorId(user);
    const name = dto.name.trim();
    const kindBase = slugifyKind(dto.kind?.trim() || name);
    // Los kinds reservados (welcome/plan_acquired/report_ready) se guardan
    // tal cual — otros módulos los buscan por ese valor exacto (ver
    // ReportEmailService.sendReportReadyEmail). El resto sigue recibiendo un
    // sufijo para permitir varias plantillas "custom" sin chocar.
    const kind = Object.prototype.hasOwnProperty.call(
      EMAIL_TEMPLATE_KIND_LABELS,
      kindBase,
    )
      ? kindBase
      : `${kindBase}_${Date.now().toString(36)}`;

    const row = await this.prisma.emailTemplate.create({
      data: {
        doctorId,
        kind,
        name,
        subject: dto.subject.trim(),
        preheader: dto.preheader?.trim() || null,
        bodyHtml: dto.bodyHtml?.trim() || EMPTY_BODY_HTML,
        isActive: dto.isActive ?? true,
        ...daysBeforeFor(kind, dto.daysBefore),
      },
    });
    return this.serialize(row);
  }

  async update(user: JwtPayload, id: string, dto: UpdateEmailTemplateDto) {
    const doctorId = await this.scopeDoctorId(user);
    const current = await this.ensureOwner(BigInt(id), doctorId);

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
        ...daysBeforeFor(current.kind, dto.daysBefore),
      },
    });
    return this.serialize(row);
  }

  async remove(user: JwtPayload, id: string) {
    const doctorId = await this.scopeDoctorId(user);
    await this.ensureOwner(BigInt(id), doctorId);
    await this.prisma.emailTemplate.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }

  /** Plantilla activa más reciente de un `kind` reservado (ej. "report_ready")
   * para un doctor — usada por ReportEmailService/AppointmentEmailService/
   * PatientInviteService al enviar. `null` si el doctor no configuró ninguna
   * (el llamador debe tener un default propio, ver EMAIL_TEMPLATE_DEFAULTS). */
  /** `doctorId: null` = la plantilla de plataforma (moderación). */
  async findActiveByKind(doctorId: bigint | null, kind: string) {
    const row = await this.prisma.emailTemplate.findFirst({
      where: { doctorId, kind, isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return row ? this.serialize(row) : null;
  }

  /** Para el selector de eventos del editor (`GET /email-templates/by-kind/:kind`):
   * la plantilla real del doctor si existe, o una "virtual" (sin `id`, con el
   * contenido default de EMAIL_TEMPLATE_DEFAULTS) para que el editor tenga
   * algo que mostrar y el doctor pueda partir de ahí. */
  async getByKindOrDefault(user: JwtPayload, kind: string) {
    const doctorId = await this.scopeDoctorId(user);
    const existing = await this.findActiveByKind(doctorId, kind);
    if (existing) return { ...existing, isDefault: false as const };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[kind];
    if (!defaults) {
      throw new NotFoundException(
        `No hay contenido por defecto para «${kind}»`,
      );
    }
    return {
      id: null as string | null,
      doctorId: doctorId?.toString() ?? null,
      kind,
      kindLabel: EMAIL_TEMPLATE_KIND_LABELS[kind] ?? kind,
      name: EMAIL_TEMPLATE_KIND_LABELS[kind] ?? kind,
      subject: defaults.subject,
      preheader: null as string | null,
      bodyHtml: defaults.bodyHtml,
      daysBefore:
        kind === APPOINTMENT_REMINDER_KIND ? REMINDER_DEFAULT_DAYS : null,
      isActive: true,
      createdAt: null as string | null,
      updatedAt: null as string | null,
      isDefault: true as const,
    };
  }

  async uploadBanner(user: JwtPayload, file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta la imagen del banner');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    const doctorId = await this.scopeDoctorId(user);
    const ext =
      extname(file.originalname).replace('.', '').toLowerCase() ||
      file.mimetype.split('/')[1] ||
      'jpg';
    const key = `email-templates/${doctorId ?? 'plataforma'}/banners/${randomUUID()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    return { key, url: urlPublicaDeBanner(baseApiPublica(this.config), key) };
  }
}
