import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { SerializedSkinAgeRule } from './skin-age-rules.util';

/** Arma lo que se recomienda: los ítems vinculados a una regla y el catálogo
 * completo del profesional, con las URLs de imagen ya firmadas. */
@Injectable()
export class SkinAgeRuleCatalogService {
  constructor(
    private readonly prisma: PrismaService,
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

  private async mapRoutineStep(step: {
    id: bigint;
    order: number;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    products: {
      product: {
        id: bigint;
        productName: string;
        productType: string;
        productUrl: string | null;
        imageUrl: string | null;
      };
    }[];
  }) {
    return {
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
    };
  }

  async loadRecommendations(doctorId: bigint, rule: SerializedSkinAgeRule) {
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
              category: { select: { id: true, categoryName: true } },
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
            categoryName: treatment.category?.categoryName ?? null,
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
            routine.steps.map((step) => this.mapRoutineStep(step)),
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

  async loadDoctorCatalog(doctorId: bigint) {
    const [routines, treatments, products] = await Promise.all([
      this.prisma.routine.findMany({
        where: { doctorId, isActive: true },
        include: {
          steps: {
            orderBy: { order: 'asc' },
            include: {
              products: {
                orderBy: { order: 'asc' },
                include: { product: true },
              },
            },
          },
        },
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
            routine.steps.map((step) => this.mapRoutineStep(step)),
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

  emptyRecommendations(snapshot: {
    skinAgeYears: number | null;
    chronologicalAgeYears: number | null;
    skinAgeDifference: number | null;
    message: string | null;
    skinType?: string | null;
    fitzpatrickScale?: string | null;
  }) {
    return {
      snapshot,
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
}
