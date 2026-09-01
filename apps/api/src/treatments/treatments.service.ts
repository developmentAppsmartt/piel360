import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisConditionsService } from '../analysis-conditions/analysis-conditions.service';
import type { CreateTreatmentCategoryDto } from './dto/create-treatment-category.dto';
import type { UpdateTreatmentCategoryDto } from './dto/update-treatment-category.dto';
import type { CreateTreatmentDto } from './dto/create-treatment.dto';
import type { UpdateTreatmentDto } from './dto/update-treatment.dto';
import type { CreateTreatmentItemDto } from './dto/create-treatment-item.dto';
import type { UpdateTreatmentItemDto } from './dto/update-treatment-item.dto';

@Injectable()
export class TreatmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorsService: DoctorsService,
    private readonly storage: StorageService,
    private readonly analysisConditions: AnalysisConditionsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async requireDoctor(userId: string) {
    return this.doctorsService.requireDoctorByUserId(userId);
  }

  private async ensureCategoryOwner(categoryId: bigint, doctorId: bigint) {
    const cat = await this.prisma.treatmentCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (cat.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a esta categoría');
    return cat;
  }

  private async ensureTreatmentOwner(treatmentId: bigint, doctorId: bigint) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id: treatmentId },
    });
    if (!treatment) throw new NotFoundException('Tratamiento no encontrado');
    if (treatment.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a este tratamiento');
    return treatment;
  }

  private async ensureItemOwner(itemId: bigint, doctorId: bigint) {
    const item = await this.prisma.treatmentProduct.findUnique({
      where: { id: itemId },
      include: { treatment: true },
    });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    if (item.treatment.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a este ítem');
    return item;
  }

  private async ensureProductOwner(productId: bigint, doctorId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.doctorId !== doctorId) {
      throw new ForbiddenException('No tienes acceso a este producto');
    }
    return product;
  }

  private treatmentInclude = {
    conditions: true,
    category: { select: { id: true, categoryName: true } },
    items: {
      include: { product: { include: { category: true } } },
      orderBy: { order: 'asc' as const },
    },
  };

  /** Si imageUrl es un key de S3 (no empieza con http), genera URL firmada
   *  (1h) — mismo criterio que ProductsService#resolveImageUrl. */
  private async resolveItemImage<
    T extends { product: { imageUrl: string | null } },
  >(item: T): Promise<T> {
    const { imageUrl } = item.product;
    if (
      !imageUrl ||
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://')
    ) {
      return item;
    }
    const signedUrl = await this.storage.getSignedUrl(imageUrl);
    return { ...item, product: { ...item.product, imageUrl: signedUrl } };
  }

  private async withResolvedItems<
    T extends { items: { product: { imageUrl: string | null } }[] },
  >(treatment: T): Promise<T> {
    return {
      ...treatment,
      items: await Promise.all(
        treatment.items.map((i) => this.resolveItemImage(i)),
      ),
    };
  }

  // ─── Categorías ─────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const doctor = await this.requireDoctor(userId);
    return this.prisma.treatmentCategory.findMany({
      where: { doctorId: doctor.id },
      include: { _count: { select: { treatments: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCategory(userId: string, dto: CreateTreatmentCategoryDto) {
    const doctor = await this.requireDoctor(userId);
    return this.prisma.treatmentCategory.create({
      data: { doctorId: doctor.id, categoryName: dto.categoryName },
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateTreatmentCategoryDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctor.id);
    return this.prisma.treatmentCategory.update({
      where: { id: BigInt(categoryId) },
      data: dto,
    });
  }

  async deleteCategory(userId: string, categoryId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctor.id);
    return this.prisma.treatmentCategory.delete({
      where: { id: BigInt(categoryId) },
    });
  }

  // ─── Tratamientos / productos sugeridos ─────────────────────────────────────

  async getTreatments(
    userId: string,
    params?: { categoryId?: string; kind?: 'plain' | 'treatment' },
  ) {
    const doctor = await this.requireDoctor(userId);
    const treatments = await this.prisma.treatment.findMany({
      where: {
        doctorId: doctor.id,
        ...(params?.categoryId
          ? { categoryId: BigInt(params.categoryId) }
          : {}),
        ...(params?.kind === 'plain'
          ? { categoryId: null }
          : params?.kind === 'treatment'
            ? { categoryId: { not: null } }
            : {}),
      },
      include: this.treatmentInclude,
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(treatments.map((t) => this.withResolvedItems(t)));
  }

  async getTreatment(userId: string, treatmentId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    const treatment = await this.prisma.treatment.findUniqueOrThrow({
      where: { id: BigInt(treatmentId) },
      include: this.treatmentInclude,
    });
    return this.withResolvedItems(treatment);
  }

  async createTreatment(userId: string, dto: CreateTreatmentDto) {
    const doctor = await this.requireDoctor(userId);
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.ensureCategoryOwner(BigInt(dto.categoryId), doctor.id);
    }
    const treatment = await this.prisma.treatment.create({
      data: {
        doctorId: doctor.id,
        categoryId:
          dto.categoryId !== undefined && dto.categoryId !== null
            ? BigInt(dto.categoryId)
            : null,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        conditions: dto.conditions?.length
          ? {
              create: dto.conditions.map((c) => ({
                metricType: c.metricType,
                region: c.region,
                operator: c.operator,
                value: c.value,
                textValue: c.textValue,
              })),
            }
          : undefined,
      },
      include: this.treatmentInclude,
    });
    return this.withResolvedItems(treatment);
  }

  async updateTreatment(
    userId: string,
    treatmentId: string,
    dto: UpdateTreatmentDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.ensureCategoryOwner(BigInt(dto.categoryId), doctor.id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.treatment.update({
        where: { id: BigInt(treatmentId) },
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
          ...(dto.categoryId !== undefined
            ? {
                categoryId:
                  dto.categoryId === null ? null : BigInt(dto.categoryId),
              }
            : {}),
        },
      });
      if (dto.conditions !== undefined) {
        await tx.treatmentCondition.deleteMany({
          where: { treatmentId: BigInt(treatmentId) },
        });
        if (dto.conditions.length > 0) {
          await tx.treatmentCondition.createMany({
            data: dto.conditions.map((c) => ({
              treatmentId: BigInt(treatmentId),
              metricType: c.metricType,
              region: c.region,
              operator: c.operator,
              value: c.value,
              textValue: c.textValue,
            })),
          });
        }
      }
    });

    const treatment = await this.prisma.treatment.findUniqueOrThrow({
      where: { id: BigInt(treatmentId) },
      include: this.treatmentInclude,
    });
    return this.withResolvedItems(treatment);
  }

  async deleteTreatment(userId: string, treatmentId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    return this.prisma.treatment.delete({ where: { id: BigInt(treatmentId) } });
  }

  // ─── Ítems (productos) ──────────────────────────────────────────────────────

  async createItem(
    userId: string,
    treatmentId: string,
    dto: CreateTreatmentItemDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    await this.ensureProductOwner(BigInt(dto.productId), doctor.id);
    const item = await this.prisma.treatmentProduct.create({
      data: {
        treatmentId: BigInt(treatmentId),
        productId: BigInt(dto.productId),
        order: dto.order,
        note: dto.note,
      },
      include: { product: { include: { category: true } } },
    });
    return this.resolveItemImage(item);
  }

  async updateItem(
    userId: string,
    treatmentId: string,
    itemId: string,
    dto: UpdateTreatmentItemDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    const item = await this.ensureItemOwner(BigInt(itemId), doctor.id);
    if (item.treatmentId !== BigInt(treatmentId)) {
      throw new NotFoundException('Ítem no encontrado en este tratamiento');
    }
    if (dto.productId !== undefined) {
      await this.ensureProductOwner(BigInt(dto.productId), doctor.id);
    }
    const updated = await this.prisma.treatmentProduct.update({
      where: { id: BigInt(itemId) },
      data: {
        order: dto.order,
        note: dto.note,
        productId:
          dto.productId !== undefined ? BigInt(dto.productId) : undefined,
      },
      include: { product: { include: { category: true } } },
    });
    return this.resolveItemImage(updated);
  }

  async deleteItem(userId: string, treatmentId: string, itemId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);
    const item = await this.ensureItemOwner(BigInt(itemId), doctor.id);
    if (item.treatmentId !== BigInt(treatmentId)) {
      throw new NotFoundException('Ítem no encontrado en este tratamiento');
    }
    return this.prisma.treatmentProduct.delete({
      where: { id: BigInt(itemId) },
    });
  }

  async reorderItems(
    userId: string,
    treatmentId: string,
    orderedItemIds: string[],
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureTreatmentOwner(BigInt(treatmentId), doctor.id);

    await this.prisma.$transaction(
      orderedItemIds.map((itemId, index) =>
        this.prisma.treatmentProduct.updateMany({
          where: { id: BigInt(itemId), treatmentId: BigInt(treatmentId) },
          data: { order: index },
        }),
      ),
    );

    return this.getTreatment(userId, treatmentId);
  }

  // ─── Motor de recomendación ─────────────────────────────────────────────────

  /** Tratamientos/productos sugeridos activos del doctor cuyas condiciones
   * (lógica O) matchean los resultados estructurados de un análisis YouCam. */
  async getRecommendedTreatments(userId: string, analysisId: string) {
    const { doctor, results, patientBirthDate, analysisDate } =
      await this.analysisConditions.loadAnalysisResultsForDoctor(
        userId,
        analysisId,
      );
    if (results.length === 0) return [];

    const treatments = await this.prisma.treatment.findMany({
      where: { doctorId: doctor.id, isActive: true },
      include: this.treatmentInclude,
    });

    const matched = treatments.filter((treatment) =>
      this.analysisConditions.matchesAnyCondition(
        treatment.conditions,
        results,
        { patientBirthDate, analysisDate },
      ),
    );

    return Promise.all(matched.map((t) => this.withResolvedItems(t)));
  }
}
