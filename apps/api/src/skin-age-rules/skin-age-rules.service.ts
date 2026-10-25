import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type {
  CreateSkinAgeRuleDto,
  UpdateSkinAgeRuleDto,
} from './dto/skin-age-rule.dto';
import {
  DEFAULT_SKIN_AGE_RULES,
  serializeSkinAgeRule,
} from './skin-age-rules.util';

/** CRUD de las reglas de edad de piel. Lo que se recomienda con ellas vive en
 * SkinAgeRecommendationsService. */
@Injectable()
export class SkinAgeRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.resolve(userId);
    if (ctx.isOrgMember && !ctx.isOrgOwner) {
      if (!ctx.teamPermissions.includes('skin_age_rules')) {
        throw new ForbiddenException(
          'No tienes permiso para acceder a este módulo del equipo',
        );
      }
    }
    // Miembro: catálogo del owner (mismas reglas que productos/tratamientos).
    return ctx.catalogDoctorId;
  }

  private validateRange(minDifference: number, maxDifference: number) {
    if (minDifference > maxDifference) {
      throw new BadRequestException(
        'El mínimo de diferencia no puede ser mayor que el máximo',
      );
    }
  }

  private async ensureRuleOwner(ruleId: bigint, doctorId: bigint) {
    const rule = await this.prisma.skinAgeRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    if (rule.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a esta regla');
    }
    return rule;
  }

  private async seedDefaults(doctorId: bigint) {
    await this.prisma.skinAgeRule.createMany({
      data: DEFAULT_SKIN_AGE_RULES.map((rule) => ({
        doctorId,
        label: rule.label,
        description: rule.description ?? null,
        minDifference: rule.minDifference,
        maxDifference: rule.maxDifference,
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
    let rules = await this.prisma.skinAgeRule.findMany({
      where: { doctorId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (rules.length === 0) {
      await this.seedDefaults(doctorId);
      rules = await this.prisma.skinAgeRule.findMany({
        where: { doctorId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    }
    return rules.map((rule) => serializeSkinAgeRule(rule));
  }

  async createRule(userId: string, dto: CreateSkinAgeRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    this.validateRange(dto.minDifference, dto.maxDifference);
    const rule = await this.prisma.skinAgeRule.create({
      data: {
        doctorId,
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        minDifference: dto.minDifference,
        maxDifference: dto.maxDifference,
        priority: dto.priority ?? 'medium',
        colorKey: dto.colorKey ?? 'blue',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        routineIds: dto.routineIds ?? [],
        treatmentIds: dto.treatmentIds ?? [],
        productGroupIds: dto.productGroupIds ?? [],
        supplementGroupIds: dto.supplementGroupIds ?? [],
        skinTypes: dto.skinTypes ?? [],
        fitzpatrickScales: dto.fitzpatrickScales ?? [],
      },
    });
    return serializeSkinAgeRule(rule);
  }

  async updateRule(userId: string, id: string, dto: UpdateSkinAgeRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const existing = await this.ensureRuleOwner(BigInt(id), doctorId);
    const minDifference = dto.minDifference ?? existing.minDifference;
    const maxDifference = dto.maxDifference ?? existing.maxDifference;
    this.validateRange(minDifference, maxDifference);

    const rule = await this.prisma.skinAgeRule.update({
      where: { id: BigInt(id) },
      data: {
        label: dto.label?.trim(),
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : undefined,
        minDifference: dto.minDifference,
        maxDifference: dto.maxDifference,
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
        fitzpatrickScales: dto.fitzpatrickScales,
      },
    });
    return serializeSkinAgeRule(rule);
  }

  async deleteRule(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRuleOwner(BigInt(id), doctorId);
    await this.prisma.skinAgeRule.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }
}
