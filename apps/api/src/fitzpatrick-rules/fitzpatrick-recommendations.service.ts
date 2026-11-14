import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  analisisPiel360SkinType,
  parseAnalisisPiel360Metrics,
  type AnalisisPiel360RawResponse,
  type FitzpatrickResult,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import { StorageService } from '../storage/storage.service';
import {
  serializeFitzpatrickRule,
  type SerializedFitzpatrickRule,
} from './fitzpatrick-rule-serialize';
import { pickBestMatchingRule } from './fitzpatrick-rules.util';

/** Extrae el fototipo de `Analysis.aiRawResponse` cuando el análisis es de
 * proveedor Fitzpatrick (ver FitzpatrickAnalysesService) — shape
 * `{ fitzpatrick_scale, timed }`. */
function readFitzpatrickScale(aiRawResponse: unknown): string | null {
  if (!aiRawResponse || typeof aiRawResponse !== 'object') return null;
  const scale = (aiRawResponse as Partial<FitzpatrickResult>).fitzpatrick_scale;
  return typeof scale === 'string' ? scale : null;
}

/** Biotipo general de un análisis estético (null si no es estético). */
function readSkinType(aiRawResponse: unknown): string | null {
  return analisisPiel360SkinType(
    parseAnalisisPiel360Metrics(
      aiRawResponse as AnalisisPiel360RawResponse | null,
    ),
  );
}

/** Qué regla de fototipo aplica a un análisis y lo que tiene vinculado. */
@Injectable()
export class FitzpatrickRecommendationsService {
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

  private async loadRecommendations(
    doctorId: bigint,
    rule: SerializedFitzpatrickRule,
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
            include: {
              steps: {
                orderBy: { order: 'asc' },
                // Mismos productos vinculados que devuelven las reglas por
                // edad de piel — sin esto las rutinas por fototipo llegaban
                // al front sin `products`.
                include: {
                  products: {
                    orderBy: { order: 'asc' },
                    include: { product: true },
                  },
                },
              },
            },
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
      treatments.map(
        (treatment) => [treatment.id.toString(), treatment] as const,
      ),
    );
    const productMap = new Map(
      catalogProducts.map(
        (product) => [product.id.toString(), product] as const,
      ),
    );

    const mapTreatmentGroup = async (ids: string[]) =>
      Promise.all(
        ids
          .map((id) => treatmentMap.get(id))
          .filter(
            (treatment): treatment is (typeof treatments)[number] =>
              !!treatment,
          )
          .map(async (treatment) => ({
            id: treatment.id.toString(),
            name: treatment.name,
            description: treatment.description,
            stepsCount: treatment.items.length,
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
              products: await Promise.all(
                step.products.map(async (link) => ({
                  id: link.product.id.toString(),
                  productName: link.product.productName,
                  productType: link.product.productType,
                  productUrl: link.product.productUrl,
                  imageUrl: await this.resolveMediaUrl(link.product.imageUrl),
                })),
              ),
            })),
          ),
        })),
      ),
      treatments: await mapTreatmentGroup(rule.treatmentIds),
      products: await mapCatalogProducts(rule.productGroupIds, 'product'),
      supplements: await mapCatalogProducts(
        rule.supplementGroupIds,
        'supplement',
      ),
    };
  }

  private emptyRecommendations(message: string | null) {
    return {
      snapshot: { fitzpatrickScale: null as string | null, message },
      matchedRule: null,
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

  async matchAndRecommend(
    doctorId: bigint,
    fitzpatrickScale: string,
    skinType: string | null,
  ) {
    const rules = await this.prisma.fitzpatrickRule.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const matched = pickBestMatchingRule(
      rules.map(serializeFitzpatrickRule),
      fitzpatrickScale,
      skinType,
    );
    if (!matched) {
      // El mensaje va en el snapshot: antes se pisaba con `message: null` y
      // el panel del análisis no decía por qué no había recomendaciones.
      const message = 'Ninguna regla coincide con este fototipo y biotipo.';
      return {
        ...this.emptyRecommendations(message),
        snapshot: { fitzpatrickScale, skinType, message },
      };
    }
    return {
      snapshot: { fitzpatrickScale, skinType, message: null },
      matchedRule: matched,
      recommendations: await this.loadRecommendations(doctorId, matched),
    };
  }

  /** El biotipo sale del propio análisis si es estético. Si no (el análisis
   * de fototipo no lo trae), del estético más reciente del paciente; sin
   * ninguno, null: las reglas con biotipos específicos no aplican. */
  private async resolveSkinType(analysis: {
    patientId: bigint;
    analisisPiel360TaskId: string | null;
    aiRawResponse: unknown;
  }): Promise<string | null> {
    if (analysis.analisisPiel360TaskId) {
      return readSkinType(analysis.aiRawResponse);
    }
    const aesthetic = await this.prisma.analysis.findMany({
      where: {
        patientId: analysis.patientId,
        analisisPiel360TaskId: { not: null },
        isValid: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { aiRawResponse: true },
    });
    for (const row of aesthetic) {
      const skinType = readSkinType(row.aiRawResponse);
      if (skinType) return skinType;
    }
    return null;
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

    return this.matchAndRecommend(
      await this.orgContext.catalogDoctorIdFor(analysis.patient.doctorId),
      fitzpatrickScale,
      await this.resolveSkinType(analysis),
    );
  }
}
