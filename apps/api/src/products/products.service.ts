import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamMemberPermission } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
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
    private readonly orgContext: OrgContextService,
    private readonly storage: StorageService,
    private readonly appConfig: AppConfigService,
  ) {}

  private async catalogDoctorId(
    userId: string,
    permission: TeamMemberPermission = 'products',
  ) {
    const ctx = await this.orgContext.assertTeamPermissionForUser(
      userId,
      permission,
    );
    return ctx.catalogDoctorId;
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

  async getCategories(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    return this.prisma.productCategory.findMany({
      where: { doctorId },
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const doctorId = await this.catalogDoctorId(userId);
    return this.prisma.productCategory.create({
      data: { doctorId, categoryName: dto.categoryName },
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctorId);
    return this.prisma.productCategory.update({
      where: { id: BigInt(categoryId) },
      data: dto,
    });
  }

  async deleteCategory(userId: string, categoryId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureCategoryOwner(BigInt(categoryId), doctorId);
    return this.prisma.productCategory.delete({
      where: { id: BigInt(categoryId) },
    });
  }

  async getProducts(userId: string, categoryId?: string, productType?: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const products = await this.prisma.product.findMany({
      where: {
        doctorId,
        ...(categoryId ? { categoryId: BigInt(categoryId) } : {}),
        ...(productType ? { productType } : {}),
      },
      include: { category: { select: { id: true, categoryName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(products.map((p) => this.resolveImageUrl(p)));
  }

  async getProduct(userId: string, productId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const product = await this.ensureProductOwner(BigInt(productId), doctorId);
    return this.resolveImageUrl(product);
  }

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
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureCategoryOwner(BigInt(dto.categoryId), doctorId);
    const currencyCode =
      dto.currencyCode ?? (await this.appConfig.getCurrencyCode());

    return this.prisma.product.create({
      data: {
        doctorId,
        categoryId: BigInt(dto.categoryId),
        productName: dto.productName,
        productType: dto.productType ?? 'product',
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
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureProductOwner(BigInt(productId), doctorId);
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryOwner(BigInt(dto.categoryId), doctorId);
    }
    return this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        ...(dto.categoryId !== undefined
          ? { categoryId: BigInt(dto.categoryId) }
          : {}),
        productName: dto.productName,
        productType: dto.productType,
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
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureProductOwner(BigInt(productId), doctorId);
    return this.prisma.product.delete({ where: { id: BigInt(productId) } });
  }

  async uploadProductImage(
    userId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    await this.ensureProductOwner(BigInt(productId), doctorId);

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `products/${productId}/image.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);

    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: { imageUrl: key },
    });

    return this.resolveImageUrl(updated);
  }
}
