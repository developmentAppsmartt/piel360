import { FileInterceptor } from '@nestjs/platform-express';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { SkinAgeRulesService } from '../skin-age-rules/skin-age-rules.service';
import { AnalysesService } from './analyses.service';
import { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';

interface UploadedImage {
  buffer: Buffer;
}

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    private readonly skinAgeRulesService: SkinAgeRulesService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateAnalysisDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!image?.buffer?.length) {
      throw new BadRequestException(
        'Falta la imagen (campo "image") o llegó vacía',
      );
    }
    return this.analysesService.performAnalysis(dto, image.buffer, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.analysesService.findAll(user);
  }

  /** Debe ir antes de `:id` para no capturar "consumption" como id. */
  @Get('consumption')
  @UseGuards(PermissionsGuard)
  @RequirePermission('view_analysis_consumption')
  consumption(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analysesService.getConsumption(user, { from, to });
  }

  /** Poll de captura: isValid/error sin exponer el resultado clínico. */
  @Get(':id/processing-status')
  processingStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysesService.getProcessingStatus(id, user);
  }

  /** Recomendaciones + catálogo del médico del paciente (doctor y paciente). */
  @Get(':id/care-recommendations')
  careRecommendations(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.skinAgeRulesService.careRecommendationsForAnalysis(
      user.sub,
      id,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysesService.findOne(id, user);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'empresa', 'superadmin')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmAnalysisDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysesService.confirm(id, dto, user);
  }

  /** Publica el análisis en el historial del paciente (app móvil). */
  @Patch(':id/share')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'empresa', 'superadmin')
  share(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysesService.shareWithPatient(id, user);
  }

  /** Deja de publicar el análisis al paciente. */
  @Patch(':id/unshare')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'empresa', 'superadmin')
  unshare(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysesService.unshareWithPatient(id, user);
  }
}
