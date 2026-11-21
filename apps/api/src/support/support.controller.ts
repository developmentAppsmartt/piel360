import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { SUPPORT_ATTACHMENT_MAX_BYTES } from '@piel360/shared';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { SupportService } from './support.service';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** Formulario «Enviar una solicitud de asistencia» del panel. */
  @Post('requests')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: memoryStorage(),
      limits: { fileSize: SUPPORT_ATTACHMENT_MAX_BYTES },
    }),
  )
  create(
    @Body() dto: CreateSupportRequestDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.support.send(dto, user, file);
  }
}
