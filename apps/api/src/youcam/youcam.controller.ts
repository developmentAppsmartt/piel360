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
import { CreateYoucamAnalysisDto } from './dto/create-youcam-analysis.dto';
import { YoucamAnalysesService } from './youcam-analyses.service';

interface UploadedImage {
  buffer: Buffer;
}

@Controller('youcam')
@UseGuards(JwtAuthGuard)
export class YoucamController {
  constructor(private readonly youcamAnalyses: YoucamAnalysesService) {}

  @Post('analyses')
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateYoucamAnalysisDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!image)
      throw new BadRequestException('Falta la imagen (campo "image")');
    return this.youcamAnalyses.createAnalysis(dto, image.buffer, user);
  }
}
