import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import {
  computeSkinAgeSnapshot,
  readYoucamSkinAgeYears,
} from '../youcam/skin-age-snapshot.util';
import type {
  CreateSkinAgeRuleDto,
  SimulateSkinAgeRuleDto,
  UpdateSkinAgeRuleDto,
} from './dto/skin-age-rule.dto';
import {
  DEFAULT_SKIN_AGE_RULES,
  buildSimulationSnapshot,
  parseIdList,
  pickBestMatchingRule,
} from './skin-age-rules.util';

type RuleRow = {
  id: bigint;
  doctorId: bigint;
  label: string;
  description: string | null;
  minDifference: number;
  maxDifference: number;
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

@Injectable()
export class SkinAgeRulesService {
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
      minDifference: rule.minDifference,
      maxDifference: rule.maxDifference,
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
    return rules.map((rule) => this.serializeRule(rule));
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
      },
    });
    return this.serializeRule(rule);
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
        routineIds:
          dto.routineIds !== undefined
            ? dto.routineIds
            : undefined,
        treatmentIds:
          dto.treatmentIds !== undefined
            ? dto.treatmentIds
            : undefined,
        productGroupIds:
          dto.productGroupIds !== undefined
            ? dto.productGroupIds
            : undefined,
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
    await this.prisma.skinAgeRule.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }

  private async loadRecommendations(
    doctorId: bigint,
    rule: ReturnType<SkinAgeRulesService['serializeRule']>,
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

  async simulate(userId: string, dto: SimulateSkinAgeRuleDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const snapshot = buildSimulationSnapshot(dto.birthDate, dto.skinAgeYears);
    if (snapshot.skinAgeDifference == null) {
      throw new BadRequestException('No se pudo calcular la diferencia de edad');
    }

    const rules = await this.listRules(userId);
    const matched = pickBestMatchingRule(rules, snapshot.skinAgeDifference);
    if (!matched) {
      return {
        snapshot,
        matchedRule: null,
        recommendations: {
          routines: [],
          treatments: [],
          products: [],
          supplements: [],
        },
      };
    }

    const recommendations = await this.loadRecommendations(doctorId, matched);
    return {
      snapshot,
      matchedRule: matched,
      recommendations,
    };
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
      return this.emptyRecommendations({
        skinAgeYears: null,
        chronologicalAgeYears: null,
        skinAgeDifference: null,
        message: 'El paciente no está vinculado a un profesional.',
      });
    }

    return this.buildCareRecommendations(
      analysis.patient.doctorId,
      analysis.patient,
      analysis,
    );
  }

  /**
   * Bundle para la UI de resultados (doctor o paciente con acceso al análisis):
   * regla de edad de piel + catálogo completo del médico del paciente.
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

    // Superadmin / doctor del equipo / paciente solo si el análisis fue compartido.
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
        ...(await this.emptyRecommendations({
          skinAgeYears: null,
          chronologicalAgeYears: null,
          skinAgeDifference: null,
          message: 'El paciente no está vinculado a un profesional.',
        })),
        catalog: {
          routines: [],
          treatments: [],
          products: [],
          supplements: [],
        },
      };
    }

    const doctorId = analysis.patient.doctorId;
    const matched = await this.buildCareRecommendations(
      doctorId,
      analysis.patient,
      analysis,
    );
    const catalog = await this.loadDoctorCatalog(doctorId);
    return { ...matched, catalog };
  }

  private async buildCareRecommendations(
    doctorId: bigint,
    patient: {
      birthDate: Date | null;
      lastSkinAgeYears: number | null;
      lastChronologicalAgeYears: number | null;
      lastSkinAgeDifference: number | null;
    },
    analysis: {
      skinAgeYears: number | null;
      aiRawResponse: unknown;
      createdAt: Date;
    },
  ) {
    const skinAgeYears =
      analysis.skinAgeYears ??
      readYoucamSkinAgeYears(analysis.aiRawResponse) ??
      patient.lastSkinAgeYears ??
      null;
    const snap = computeSkinAgeSnapshot({
      skinAgeYears,
      birthDate: patient.birthDate,
      analysisDate: analysis.createdAt,
    });
    const skinAgeDifference =
      snap.skinAgeDifference ?? patient.lastSkinAgeDifference ?? null;
    const snapshot = {
      skinAgeYears: snap.skinAgeYears ?? patient.lastSkinAgeYears ?? null,
      chronologicalAgeYears:
        snap.chronologicalAgeYears ?? patient.lastChronologicalAgeYears ?? null,
      skinAgeDifference,
      message:
        skinAgeDifference == null
          ? 'Aún no hay edad de piel para aplicar reglas.'
          : null,
    };

    if (skinAgeDifference == null) {
      return this.emptyRecommendations(snapshot);
    }

    const rules = await this.prisma.skinAgeRule.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const serialized = rules.map((rule) => this.serializeRule(rule));
    const matched = pickBestMatchingRule(serialized, skinAgeDifference);
    if (!matched) {
      return this.emptyRecommendations({
        ...snapshot,
        message: 'Ninguna regla coincide con la diferencia de edad de piel.',
      });
    }

    const recommendations = await this.loadRecommendations(doctorId, matched);
    return {
      snapshot,
      matchedRule: matched,
      recommendations,
    };
  }

  private async loadDoctorCatalog(doctorId: bigint) {
    const [routines, treatments, products] = await Promise.all([
      this.prisma.routine.findMany({
        where: { doctorId, isActive: true },
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.treatment.findMany({
        where: { doctorId, isActive: true },
        include: {
          category: { select: { id: true, categoryName: true } },
          items: {
            orderBy: { order: 'asc' },
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { doctorId },
        include: { category: { select: { id: true, categoryName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const mapProduct = async (product: (typeof products)[number]) => ({
      id: product.id.toString(),
      name: product.productName,
      description: product.productDescription,
      productType: product.productType,
      productUrl: product.productUrl,
      imageUrl: await this.resolveMediaUrl(product.imageUrl),
      categoryName: product.category?.categoryName ?? null,
    });

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
      treatments: await Promise.all(
        treatments
          .filter((t) => t.categoryId != null)
          .map(async (treatment) => ({
            id: treatment.id.toString(),
            name: treatment.name,
            description: treatment.description,
            categoryName: treatment.category?.categoryName ?? null,
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
      ),
      products: await Promise.all(
        products
          .filter((p) => (p.productType ?? 'product') === 'product')
          .map(mapProduct),
      ),
      supplements: await Promise.all(
        products.filter((p) => p.productType === 'supplement').map(mapProduct),
      ),
    };
  }

  private emptyRecommendations(snapshot: {
    skinAgeYears: number | null;
    chronologicalAgeYears: number | null;
    skinAgeDifference: number | null;
    message: string | null;
  }) {
    return {
      snapshot,
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

  /**
   * Consejos para el paciente autenticado: usa el **último análisis compartido**
   * con edad de piel (YouCam). Si no hay, cae al snapshot del paciente.
   */
  async recommendForPatientUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!patient) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    if (!patient.doctorId) {
      return this.emptyRecommendations({
        skinAgeYears: null,
        chronologicalAgeYears: null,
        skinAgeDifference: null,
        message: 'Este paciente aún no está vinculado a un profesional.',
      });
    }

    // Reglas/productos viven en el catálogo del owner (si el doctor es equipo).
    const linkedDoctor = await this.prisma.doctor.findUnique({
      where: { id: patient.doctorId },
      select: { userId: true },
    });
    const rulesDoctorId = linkedDoctor?.userId
      ? (await this.orgContext.resolve(linkedDoctor.userId.toString()))
          .catalogDoctorId
      : patient.doctorId;

    // Preferir análisis compartidos (más reciente primero) hasta encontrar
    // uno con edad de piel. Evita que un fototipo/otro tipo posterior tape
    // el YouCam compartido.
    const sharedCandidates = await this.prisma.analysis.findMany({
      where: { patientId: patient.id, sharedWithPatient: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        skinAgeYears: true,
        chronologicalAgeYears: true,
        skinAgeDifference: true,
        aiRawResponse: true,
        youcamTaskId: true,
      },
    });

    let skinAgeYears: number | null = null;
    let chronologicalAgeYears: number | null = null;
    let skinAgeDifference: number | null = null;

    for (const candidate of sharedCandidates) {
      const fromColumn = candidate.skinAgeYears;
      const fromRaw = readYoucamSkinAgeYears(candidate.aiRawResponse);
      const resolvedSkinAge = fromColumn ?? fromRaw;
      if (resolvedSkinAge == null) continue;

      const snap = computeSkinAgeSnapshot({
        skinAgeYears: resolvedSkinAge,
        birthDate: patient.birthDate,
        analysisDate: candidate.createdAt,
      });
      skinAgeYears = snap.skinAgeYears;
      chronologicalAgeYears =
        snap.chronologicalAgeYears ?? candidate.chronologicalAgeYears;
      skinAgeDifference =
        snap.skinAgeDifference ?? candidate.skinAgeDifference;
      break;
    }

    // Solo análisis compartidos alimentan consejos (no lastSkinAge* del CRM,
    // que se actualiza al completar antes de compartir).

    const snapshot = {
      skinAgeYears,
      chronologicalAgeYears,
      skinAgeDifference,
      message:
        skinAgeDifference == null
          ? sharedCandidates.length === 0
            ? 'Aún no tienes un análisis compartido por tu profesional.'
            : 'Aún no hay un análisis de edad de piel compartido para generar consejos.'
          : null,
    };

    if (skinAgeDifference == null) {
      return this.emptyRecommendations(snapshot);
    }

    const rules = await this.prisma.skinAgeRule.findMany({
      where: { doctorId: rulesDoctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const serialized = rules.map((rule) => this.serializeRule(rule));
    const matched = pickBestMatchingRule(serialized, skinAgeDifference);
    if (!matched) {
      return this.emptyRecommendations({
        ...snapshot,
        message:
          'No hay una regla de edad de piel que coincida con tu diferencia actual.',
      });
    }

    const recommendations = await this.loadRecommendations(
      rulesDoctorId,
      matched,
    );
    return {
      snapshot,
      matchedRule: matched,
      recommendations,
    };
  }
}
