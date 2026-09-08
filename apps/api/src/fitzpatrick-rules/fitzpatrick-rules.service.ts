import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FitzpatrickResult } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import type {
  CreateFitzpatrickRuleDto,
  SimulateFitzpatrickRuleDto,
  UpdateFitzpatrickRuleDto,
} from './dto/fitzpatrick-rule.dto';
import {
  DEFAULT_FITZPATRICK_RULES,
  parseIdList,
  pickBestMatchingRule,
} from './fitzpatrick-rules.util';

type RuleRow = {
  id: bigint;
  doctorId: bigint;
  label: string;
  description: string | null;
  fitzpatrickScale: string;
  priority: string;
  colorKey: string;
  sortOrder: number;
  isActive: boolean;
  routineIds: unknown;
  treatmentIds: unknown;
  productGroupIds: unknown;
  supplementGroupIds: unknown;
  createdAt: Date;
  updatedAt: Date;
};

/** Extrae el fototipo de `Analysis.aiRawResponse` cuando el análisis es de
 * proveedor Fitzpatrick (ver FitzpatrickAnalysesService) — shape
 * `{ fitzpatrick_scale, timed }`. */
function readFitzpatrickScale(aiRawResponse: unknown): string | null {
  if (!aiRawResponse || typeof aiRawResponse !== 'object') return null;
  const scale = (aiRawResponse as Partial<FitzpatrickResult>).fitzpatrick_scale;
  return typeof scale === 'string' ? scale : null;
}

@Injectable()
export class FitzpatrickRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
  ) {}

  /** Key S3 → URL firmada; deja http(s) tal cual (mismo criterio que Products/Routines). */
  private async resolveMediaUrl(
    url: string | null | undefined,
  ): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    try {
      return await this.storage.getSignedUrl(url);
    } catch {
      return url;
    }
  }

  private async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.resolve(userId);
    if (ctx.isOrgMember && !ctx.isOrgOwner) {
      const allowed =
        ctx.teamPermissions.includes('routines') ||
        ctx.teamPermissions.includes('treatments');
      if (!allowed) {
        throw new ForbiddenException(
          'No tienes permiso para acceder a este módulo del equipo',
        );
      }
    }
    // Miembro: catálogo del owner (mismas reglas que productos/tratamientos).
    return ctx.catalogDoctorId;
  }

  private serializeRule(rule: RuleRow) {
    return {
      id: rule.id.toString(),
      doctorId: rule.doctorId.toString(),
      label: rule.label,
      description: rule.description,
      fitzpatrickScale: rule.fitzpatrickScale,
      priority: rule.priority,
      colorKey: rule.colorKey,
      sortOrder: rule.sortOrder,
      isActive: rule.isActive,
      routineIds: parseIdList(rule.routineIds),
      treatmentIds: parseIdList(rule.treatmentIds),
      productGroupIds: parseIdList(rule.productGroupIds),
      supplementGroupIds: parseIdList(rule.supplementGroupIds),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
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
    return rules.map((rule) => this.serializeRule(rule));
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
      },
    });
    return this.serializeRule(rule);
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
      },
    });
    return this.serializeRule(rule);
  }

  async deleteRule(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureRuleOwner(BigInt(id), doctorId);
    await this.prisma.fitzpatrickRule.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }

  private async loadRecommendations(
    doctorId: bigint,
    rule: ReturnType<FitzpatrickRulesService['serializeRule']>,
  ) {
    const routineIds = rule.routineIds.map((id) => BigInt(id));
    const treatmentIds = rule.treatmentIds.map((id) => BigInt(id));
    /** IDs del catálogo Product (no grupos Treatment). */
    const productIds = rule.productGroupIds.map((id) => BigInt(id));
    const supplementIds = rule.supplementGroupIds.map((id) => BigInt(id));
    const catalogProductIds = [...productIds, ...supplementIds];

    const routines =
      routineIds.length > 0
        ? await this.prisma.routine.findMany({
            where: { doctorId, id: { in: routineIds }, isActive: true },
            include: { steps: { orderBy: { order: 'asc' } } },
          })
        : [];

    const treatments =
      treatmentIds.length > 0
        ? await this.prisma.treatment.findMany({
            where: { doctorId, id: { in: treatmentIds }, isActive: true },
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: { product: true },
              },
            },
          })
        : [];

    const catalogProducts =
      catalogProductIds.length > 0
        ? await this.prisma.product.findMany({
            where: { doctorId, id: { in: catalogProductIds } },
          })
        : [];

    const treatmentMap = new Map(
      treatments.map((treatment) => [treatment.id.toString(), treatment] as const),
    );
    const productMap = new Map(
      catalogProducts.map((product) => [product.id.toString(), product] as const),
    );

    const mapTreatmentGroup = async (ids: string[]) =>
      Promise.all(
        ids
          .map((id) => treatmentMap.get(id))
          .filter(
            (treatment): treatment is (typeof treatments)[number] => !!treatment,
          )
          .map(async (treatment) => ({
            id: treatment.id.toString(),
            name: treatment.name,
            description: treatment.description,
            items: await Promise.all(
              treatment.items.map(async (item) => ({
                id: item.id.toString(),
                productId: item.productId.toString(),
                productName: item.product.productName,
                productType: item.product.productType,
                note: item.note,
                imageUrl: await this.resolveMediaUrl(item.product.imageUrl),
                productUrl: item.product.productUrl,
              })),
            ),
          })),
      );

    const mapCatalogProducts = async (
      ids: string[],
      productType: 'product' | 'supplement',
    ) =>
      Promise.all(
        ids
          .map((id) => productMap.get(id))
          .filter(
            (product): product is (typeof catalogProducts)[number] =>
              !!product && product.productType === productType,
          )
          .map(async (product) => {
            const imageUrl = await this.resolveMediaUrl(product.imageUrl);
            return {
              id: product.id.toString(),
              name: product.productName,
              description: product.productDescription,
              productType: product.productType,
              productUrl: product.productUrl,
              imageUrl,
              items: [
                {
                  id: product.id.toString(),
                  productId: product.id.toString(),
                  productName: product.productName,
                  productType: product.productType,
                  note: null as string | null,
                  imageUrl,
                  productUrl: product.productUrl,
                },
              ],
            };
          }),
      );

    return {
      routines: await Promise.all(
        routines.map(async (routine) => ({
          id: routine.id.toString(),
          name: routine.name,
          description: routine.description,
          stepsCount: routine.steps.length,
          steps: await Promise.all(
            routine.steps.map(async (step) => ({
              id: step.id.toString(),
              order: step.order,
              title: step.title,
              description: step.description,
              mediaUrl: await this.resolveMediaUrl(step.mediaUrl),
              mediaType: step.mediaType,
            })),
          ),
        })),
      ),
      treatments: await mapTreatmentGroup(rule.treatmentIds),
      products: await mapCatalogProducts(rule.productGroupIds, 'product'),
      supplements: await mapCatalogProducts(rule.supplementGroupIds, 'supplement'),
    };
  }

  private emptyRecommendations(message: string | null) {
    return {
      snapshot: { fitzpatrickScale: null as string | null, message },
      matchedRule: null as null,
      recommendations: {
        routines: [] as {
          id: string;
          name: string;
          description: string | null;
          stepsCount: number;
        }[],
        treatments: [] as {
          id: string;
          name: string;
          description: string | null;
          items: {
            id: string;
            productId: string;
            productName: string;
            productType: string;
            note: string | null;
          }[];
        }[],
        products: [] as {
          id: string;
          name: string;
          description: string | null;
          items: {
            id: string;
            productId: string;
            productName: string;
            productType: string;
            note: string | null;
          }[];
        }[],
        supplements: [] as {
          id: string;
          name: string;
          description: string | null;
          items: {
            id: string;
            productId: string;
            productName: string;
            productType: string;
            note: string | null;
          }[];
        }[],
      },
    };
  }

  private async matchAndRecommend(doctorId: bigint, fitzpatrickScale: string) {
    const rules = await this.prisma.fitzpatrickRule.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const serialized = rules.map((rule) => this.serializeRule(rule));
    const matched = pickBestMatchingRule(serialized, fitzpatrickScale);
    if (!matched) {
      return {
        ...this.emptyRecommendations(
          'Ninguna regla coincide con este fototipo.',
        ),
        snapshot: { fitzpatrickScale, message: null },
      };
    }
    const recommendations = await this.loadRecommendations(doctorId, matched);
    return {
      snapshot: { fitzpatrickScale, message: null },
      matchedRule: matched,
      recommendations,
    };
  }

  async simulate(userId: string, dto: SimulateFitzpatrickRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    return this.matchAndRecommend(doctorId, dto.fitzpatrickScale);
  }

  async recommendForAnalysis(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(analysisId) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');

    const allowed = await this.orgContext.canAccessPatientDoctorId(
      userId,
      analysis.patient.doctorId,
    );
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este análisis');
    }

    if (!analysis.patient.doctorId) {
      return this.emptyRecommendations(
        'El paciente no está vinculado a un profesional.',
      );
    }

    const fitzpatrickScale =
      readFitzpatrickScale(analysis.aiRawResponse) ??
      analysis.patient.fitzpatrickType;
    if (!fitzpatrickScale) {
      return this.emptyRecommendations(
        'Aún no hay un fototipo registrado para este paciente.',
      );
    }

    return this.matchAndRecommend(analysis.patient.doctorId, fitzpatrickScale);
  }

  /**
   * Bundle para la UI de resultados (doctor o paciente con acceso al análisis):
   * regla de fototipo + catálogo completo del médico del paciente.
   */
  async careRecommendationsForAnalysis(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: BigInt(analysisId) },
      include: { patient: true },
    });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');

    const patientUserId = analysis.patient.userId?.toString();
    const isOwnerPatient = patientUserId === userId;
    const sharedOk = isOwnerPatient && analysis.sharedWithPatient;
    const doctorOk = await this.orgContext
      .canAccessPatientDoctorId(userId, analysis.patient.doctorId)
      .catch(() => false);

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { roles: true },
    });
    const isSuperadmin = user?.roles.some((r) => r.name === 'superadmin');
    if (!isSuperadmin && !doctorOk && !sharedOk) {
      throw new ForbiddenException('No tienes acceso a este análisis');
    }

    if (!analysis.patient.doctorId) {
      return {
        ...this.emptyRecommendations(
          'El paciente no está vinculado a un profesional.',
        ),
      };
    }

    const fitzpatrickScale =
      readFitzpatrickScale(analysis.aiRawResponse) ??
      analysis.patient.fitzpatrickType;
    if (!fitzpatrickScale) {
      return this.emptyRecommendations(
        'Aún no hay un fototipo registrado para este paciente.',
      );
    }

    return this.matchAndRecommend(analysis.patient.doctorId, fitzpatrickScale);
  }

  /** Consejos para el paciente autenticado, basado en su último fototipo conocido. */
  async recommendForPatientUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!patient) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    if (!patient.doctorId) {
      return this.emptyRecommendations(
        'Este paciente aún no está vinculado a un profesional.',
      );
    }
    if (!patient.fitzpatrickType) {
      return this.emptyRecommendations(
        'Aún no tienes un fototipo registrado.',
      );
    }

    // Reglas viven en el catálogo del owner (si el doctor es equipo).
    const linkedDoctor = await this.prisma.doctor.findUnique({
      where: { id: patient.doctorId },
      select: { userId: true },
    });
    const rulesDoctorId = linkedDoctor?.userId
      ? (await this.orgContext.resolve(linkedDoctor.userId.toString()))
          .catalogDoctorId
      : patient.doctorId;

    return this.matchAndRecommend(rulesDoctorId, patient.fitzpatrickType);
  }
}
