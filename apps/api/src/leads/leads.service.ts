import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { ListLeadsQueryDto, UpdateLeadDto } from './dto/lead-admin.dto';
import { LeadNotificationService } from './lead-notification.service';

const DEFAULT_PAGE_SIZE = 25;

const clean = (value: string | undefined) => value?.trim() || null;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: LeadNotificationService,
  ) {}

  async create(dto: CreateLeadDto): Promise<void> {
    if (dto.website?.trim()) return;

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name.trim(),
        business: dto.business.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        interest: dto.interest,
        intent: dto.intent,
        planId: dto.planId ? BigInt(dto.planId) : null,
        utmSource: clean(dto.utmSource),
        utmMedium: clean(dto.utmMedium),
        utmCampaign: clean(dto.utmCampaign),
      },
    });
    // El contacto ya quedó guardado: si el correo falla, se ve en el panel.
    await this.notification.notify(lead);
  }

  async list(query: ListLeadsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const q = query.q?.trim();
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: (['name', 'business', 'email', 'phone'] as const).map(
              (field) => ({ [field]: { contains: q, mode: 'insensitive' } }),
            ),
          }
        : {}),
    };

    const [items, total, plans] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.count({ where }),
      this.prisma.plan.findMany({ select: { id: true, name: true } }),
    ]);
    const planName = new Map(plans.map((p) => [p.id.toString(), p.name]));

    return {
      items: items.map((lead) => ({
        ...lead,
        planName: lead.planId
          ? (planName.get(lead.planId.toString()) ?? null)
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const exists = await this.prisma.lead.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Lead no encontrado');
    return this.prisma.lead.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
  }
}
