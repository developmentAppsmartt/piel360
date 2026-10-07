import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
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
import { BrandingService, type BrandingImageKind } from './branding.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';

const IMAGE_KINDS = {
  'login-background': 'login-background',
  'login-logo': 'login-logo',
} as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Configuración → Personalización (solo el dueño de la cuenta). */
@Controller('doctor/branding')
@UseGuards(JwtAuthGuard, RolesGuard)
@ClinicalPanelRoles()
export class DoctorBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.branding.getOwn(user);
  }

  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBrandingDto) {
    return this.branding.update(user, dto);
  }

  @Post(':kind')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @Param('kind', new ParseEnumPipe(IMAGE_KINDS)) kind: BrandingImageKind,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.branding.uploadImage(user, kind, file);
  }

  @Delete(':kind')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('kind', new ParseEnumPipe(IMAGE_KINDS)) kind: BrandingImageKind,
  ) {
    return this.branding.removeImage(user, kind);
  }
}

/** Branding heredado que aplica la app móvil del usuario autenticado. */
@Controller('auth/me/branding')
@UseGuards(JwtAuthGuard)
export class MyBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.branding.getEffective(user.sub);
  }
}

/** Lo lee el login móvil (sin sesión) con el `publicId` que guardó antes. */
@Controller('public/branding')
export class PublicBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get(':publicId')
  get(@Param('publicId') publicId: string) {
    return this.branding.getPublic(publicId);
  }
}
