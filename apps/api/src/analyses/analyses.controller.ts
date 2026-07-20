import { FileInterceptor } from '@nestjs/platform-express';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { AnalysesService } from './analyses.service';
import { ConfirmAnalysisDto } from './dto/confirm-analysis.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';

interface UploadedImage {
  buffer: Buffer;
}

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateAnalysisDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!image)
      throw new BadRequestException('Falta la imagen (campo "image")');
    return this.analysesService.performAnalysis(dto, image.buffer, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.analysesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysesService.findOne(id, user);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmAnalysisDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analysesService.confirm(id, dto, user);
  }
}
