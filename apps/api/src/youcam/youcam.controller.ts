import { FileInterceptor } from '@nestjs/platform-express';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { CreateAnalisisPiel360AnalysisDto } from './dto/create-youcam-analysis.dto';
import { AnalisisPiel360AnalysesService } from './youcam-analyses.service';

interface UploadedImage {
  buffer: Buffer;
}

@Controller('analisispiel360')
@UseGuards(JwtAuthGuard)
export class AnalisisPiel360Controller {
  constructor(private readonly analisisPiel360Analyses: AnalisisPiel360AnalysesService) {}

  @Post('analyses')
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateAnalisisPiel360AnalysisDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!image?.buffer?.length) {
      throw new BadRequestException(
        'Falta la imagen (campo "image") o llegó vacía',
      );
    }
    return this.analisisPiel360Analyses.createAnalysis(dto, image.buffer, user);
  }
}
