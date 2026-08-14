import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';
import { StorageService } from '../storage/storage.service';
import { AppConfigService } from '../app-config/app-config.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorsService: DoctorsService,
    private readonly storage: StorageService,
    private readonly appConfig: AppConfigService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async requireDoctor(userId: string) {
    return this.doctorsService.requireDoctorByUserId(userId);
  }

  private async ensureCategoryOwner(categoryId: bigint, doctorId: bigint) {
    const cat = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (cat.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a esta categoría');
    return cat;
  }

  private async ensureProductOwner(productId: bigint, doctorId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.doctorId !== doctorId)
      throw new ForbiddenException('No tienes acceso a este producto');
    return product;
  }

  // ─── Categorías ─────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const doctor = await this.requireDoctor(userId);
    return this.prisma.productCategory.findMany({
      where: { doctorId: doctor.id },
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const doctor = await this.requireDoctor(userId);
    return this.prisma.productCategory.create({
      data: { doctorId: doctor.id, categoryName: dto.categoryName },
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctor.id);
    return this.prisma.productCategory.update({
      where: { id: BigInt(categoryId) },
      data: dto,
    });
  }

  async deleteCategory(userId: string, categoryId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctor.id);
    return this.prisma.productCategory.delete({
      where: { id: BigInt(categoryId) },
    });
  }

  // ─── Productos ──────────────────────────────────────────────────────────────

  async getProducts(userId: string, categoryId?: string) {
    const doctor = await this.requireDoctor(userId);
    const products = await this.prisma.product.findMany({
      where: {
        doctorId: doctor.id,
        ...(categoryId ? { categoryId: BigInt(categoryId) } : {}),
      },
      include: { category: { select: { id: true, categoryName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(products.map((p) => this.resolveImageUrl(p)));
  }

  async getProduct(userId: string, productId: string) {
    const doctor = await this.requireDoctor(userId);
    const product = await this.ensureProductOwner(BigInt(productId), doctor.id);
    return this.resolveImageUrl(product);
  }

  /** Si imageUrl es un key de S3 (no empieza con http), genera URL firmada (1 h). */
  private async resolveImageUrl<T extends { imageUrl: string | null }>(
    product: T,
  ): Promise<T> {
    if (
      !product.imageUrl ||
      product.imageUrl.startsWith('http://') ||
      product.imageUrl.startsWith('https://')
    ) {
      return product;
    }
    const signedUrl = await this.storage.getSignedUrl(product.imageUrl);
    return { ...product, imageUrl: signedUrl };
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureCategoryOwner(BigInt(dto.categoryId), doctor.id);
    const currencyCode =
      dto.currencyCode ?? (await this.appConfig.getCurrencyCode());

    return this.prisma.product.create({
      data: {
        doctorId: doctor.id,
        categoryId: BigInt(dto.categoryId),
        productName: dto.productName,
        productDescription: dto.productDescription,
        productUrl: dto.productUrl,
        imageUrl: dto.imageUrl,
        enablePrice: dto.enablePrice ?? false,
        pricingType: dto.pricingType,
        currencyCode,
        originalPrice: dto.originalPrice,
        sellingPrice: dto.sellingPrice,
      },
      include: { category: { select: { id: true, categoryName: true } } },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureProductOwner(BigInt(productId), doctor.id);
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryOwner(BigInt(dto.categoryId), doctor.id);
    }
    return this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        ...(dto.categoryId !== undefined
          ? { categoryId: BigInt(dto.categoryId) }
          : {}),
        productName: dto.productName,
        productDescription: dto.productDescription,
        productUrl: dto.productUrl,
        enablePrice: dto.enablePrice,
        pricingType: dto.pricingType,
        currencyCode: dto.currencyCode,
        originalPrice: dto.originalPrice,
        sellingPrice: dto.sellingPrice,
      },
      include: { category: { select: { id: true, categoryName: true } } },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureProductOwner(BigInt(productId), doctor.id);
    return this.prisma.product.delete({ where: { id: BigInt(productId) } });
  }

  /** Sube la imagen al S3 y guarda el object key (no la URL firmada)
   *  para evitar la limitación de 7 días de AWS SigV4. La URL firmada se
   *  genera en tiempo real al leer el producto (TTL: 1 h). */
  async uploadProductImage(
    userId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const doctor = await this.requireDoctor(userId);
    await this.ensureProductOwner(BigInt(productId), doctor.id);

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `products/${productId}/image.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);

    // Guardamos el key, no la URL firmada
    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: { imageUrl: key },
    });

    // Devolvemos con URL firmada fresca para que el frontend la muestre
    return this.resolveImageUrl(updated);
  }
}
