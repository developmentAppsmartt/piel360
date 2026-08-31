import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { ProductsService } from './products.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelRoles()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Categorías ─────────────────────────────────────────────────────────────

  @Get('products/categories')
  getCategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.getCategories(user.sub);
  }

  @Post('products/categories')
  createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.productsService.createCategory(user.sub, dto);
  }

  @Patch('products/categories/:id')
  updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productsService.updateCategory(user.sub, id, dto);
  }

  @Delete('products/categories/:id')
  deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.deleteCategory(user.sub, id);
  }

  // ─── Productos ──────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(
    @CurrentUser() user: JwtPayload,
    @Query('categoryId') categoryId?: string,
    @Query('productType') productType?: string,
  ) {
    return this.productsService.getProducts(user.sub, categoryId, productType);
  }

  @Get('products/:id')
  getProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.getProduct(user.sub, id);
  }

  @Post('products')
  createProduct(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createProduct(user.sub, dto);
  }

  @Patch('products/:id')
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(user.sub, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.deleteProduct(user.sub, id);
  }

  /** Upload de imagen del producto — multipart/form-data, campo "file". */
  @Post('products/:id/image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.uploadProductImage(user.sub, id, file);
  }
}
