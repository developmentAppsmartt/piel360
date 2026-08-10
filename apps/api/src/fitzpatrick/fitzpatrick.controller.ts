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
import { CreateFitzpatrickAnalysisDto } from './dto/create-fitzpatrick-analysis.dto';
import { FitzpatrickAnalysesService } from './fitzpatrick-analyses.service';

interface UploadedImage {
  buffer: Buffer;
}

@Controller('fitzpatrick')
@UseGuards(JwtAuthGuard)
export class FitzpatrickController {
  constructor(
    private readonly fitzpatrickAnalyses: FitzpatrickAnalysesService,
  ) {}

  @Post('analyses')
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateFitzpatrickAnalysisDto,
    @UploadedFile() image: UploadedImage | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!image)
      throw new BadRequestException('Falta la imagen (campo "image")');
    return this.fitzpatrickAnalyses.createAnalysis(dto, image.buffer, user);
  }
}
