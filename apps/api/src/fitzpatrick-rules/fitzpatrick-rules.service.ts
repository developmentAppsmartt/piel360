import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type {
  CreateFitzpatrickRuleDto,
  SimulateFitzpatrickRuleDto,
  UpdateFitzpatrickRuleDto,
} from './dto/fitzpatrick-rule.dto';
import { serializeFitzpatrickRule } from './fitzpatrick-rule-serialize';
import { FitzpatrickRecommendationsService } from './fitzpatrick-recommendations.service';
import { DEFAULT_FITZPATRICK_RULES } from './fitzpatrick-rules.util';

@Injectable()
export class FitzpatrickRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly recommendations: FitzpatrickRecommendationsService,
  ) {}

  private async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.resolve(userId);
    if (ctx.isOrgMember && !ctx.isOrgOwner) {
      if (!ctx.teamPermissions.includes('fitzpatrick_rules')) {
        throw new ForbiddenException(
          'No tienes permiso para acceder a este módulo del equipo',
        );
      }
    }
    // Miembro: catálogo del owner (mismas reglas que productos/tratamientos).
    return ctx.catalogDoctorId;
  }

  private async ensureRuleOwner(ruleId: bigint, doctorId: bigint) {
    const rule = await this.prisma.fitzpatrickRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    if (rule.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta regla');
    }
    return rule;
  }

  private async seedDefaults(doctorId: bigint) {
    await this.prisma.fitzpatrickRule.createMany({
      data: DEFAULT_FITZPATRICK_RULES.map((rule) => ({
        doctorId,
        label: rule.label,
        description: rule.description ?? null,
        fitzpatrickScale: rule.fitzpatrickScale,
        priority: rule.priority ?? 'medium',
        colorKey: rule.colorKey ?? 'blue',
        sortOrder: rule.sortOrder ?? 0,
        isActive: true,
        routineIds: [],
        treatmentIds: [],
        productGroupIds: [],
        supplementGroupIds: [],
      })),
    });
  }

  async listRules(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    let rules = await this.prisma.fitzpatrickRule.findMany({
      where: { doctorId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (rules.length === 0) {
      await this.seedDefaults(doctorId);
      rules = await this.prisma.fitzpatrickRule.findMany({
        where: { doctorId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    }
    return rules.map((rule) => serializeFitzpatrickRule(rule));
  }

  async createRule(userId: string, dto: CreateFitzpatrickRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const rule = await this.prisma.fitzpatrickRule.create({
      data: {
        doctorId,
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        fitzpatrickScale: dto.fitzpatrickScale,
        priority: dto.priority ?? 'medium',
        colorKey: dto.colorKey ?? 'blue',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        routineIds: dto.routineIds ?? [],
        treatmentIds: dto.treatmentIds ?? [],
        productGroupIds: dto.productGroupIds ?? [],
        supplementGroupIds: dto.supplementGroupIds ?? [],
        skinTypes: dto.skinTypes ?? [],
      },
    });
    return serializeFitzpatrickRule(rule);
  }

  async updateRule(userId: string, id: string, dto: UpdateFitzpatrickRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRuleOwner(BigInt(id), doctorId);

    const rule = await this.prisma.fitzpatrickRule.update({
      where: { id: BigInt(id) },
      data: {
        label: dto.label?.trim(),
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : undefined,
        fitzpatrickScale: dto.fitzpatrickScale,
        priority: dto.priority,
        colorKey: dto.colorKey,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        routineIds: dto.routineIds !== undefined ? dto.routineIds : undefined,
        treatmentIds:
          dto.treatmentIds !== undefined ? dto.treatmentIds : undefined,
        productGroupIds:
          dto.productGroupIds !== undefined ? dto.productGroupIds : undefined,
        supplementGroupIds:
          dto.supplementGroupIds !== undefined
            ? dto.supplementGroupIds
            : undefined,
        skinTypes: dto.skinTypes,
      },
    });
    return serializeFitzpatrickRule(rule);
  }

  async deleteRule(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRuleOwner(BigInt(id), doctorId);
    await this.prisma.fitzpatrickRule.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }

  async simulate(userId: string, dto: SimulateFitzpatrickRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    return this.recommendations.matchAndRecommend(
      doctorId,
      dto.fitzpatrickScale,
      dto.skinType ?? null,
    );
  }
}
