import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClinicalPanelRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentCategoryDto } from './dto/create-treatment-category.dto';
import { UpdateTreatmentCategoryDto } from './dto/update-treatment-category.dto';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { CreateTreatmentItemDto } from './dto/create-treatment-item.dto';
import { UpdateTreatmentItemDto } from './dto/update-treatment-item.dto';
import { ReorderTreatmentItemsDto } from './dto/reorder-treatment-items.dto';

@Controller('treatments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelRoles()
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  // ─── Categorías ─────────────────────────────────────────────────────────────

  @Get('categories')
  getCategories(@CurrentUser() user: JwtPayload) {
    return this.treatmentsService.getCategories(user.sub);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTreatmentCategoryDto,
  ) {
    return this.treatmentsService.createCategory(user.sub, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentCategoryDto,
  ) {
    return this.treatmentsService.updateCategory(user.sub, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.treatmentsService.deleteCategory(user.sub, id);
  }

  // ─── Tratamientos / productos sugeridos ─────────────────────────────────────

  @Get()
  getTreatments(
    @CurrentUser() user: JwtPayload,
    @Query('categoryId') categoryId?: string,
    @Query('kind') kind?: 'plain' | 'treatment',
  ) {
    return this.treatmentsService.getTreatments(user.sub, { categoryId, kind });
  }

  /** Tratamientos/productos sugeridos recomendados para un análisis YouCam
   * ya completado. */
  @Get('recommended/:analysisId')
  getRecommended(
    @CurrentUser() user: JwtPayload,
    @Param('analysisId') analysisId: string,
  ) {
    return this.treatmentsService.getRecommendedTreatments(
      user.sub,
      analysisId,
    );
  }

  @Get(':id')
  getTreatment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.treatmentsService.getTreatment(user.sub, id);
  }

  @Post()
  createTreatment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.treatmentsService.createTreatment(user.sub, dto);
  }

  @Patch(':id')
  updateTreatment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
  ) {
    return this.treatmentsService.updateTreatment(user.sub, id, dto);
  }

  @Delete(':id')
  deleteTreatment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.treatmentsService.deleteTreatment(user.sub, id);
  }

  // ─── Ítems (productos) ──────────────────────────────────────────────────────

  @Post(':id/items')
  createItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateTreatmentItemDto,
  ) {
    return this.treatmentsService.createItem(user.sub, id, dto);
  }

  @Patch(':id/items/reorder')
  reorderItems(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReorderTreatmentItemsDto,
  ) {
    return this.treatmentsService.reorderItems(
      user.sub,
      id,
      dto.orderedItemIds,
    );
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTreatmentItemDto,
  ) {
    return this.treatmentsService.updateItem(user.sub, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  deleteItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.treatmentsService.deleteItem(user.sub, id, itemId);
  }
}
