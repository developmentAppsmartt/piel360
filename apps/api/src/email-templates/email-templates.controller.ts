import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import {
  CreateEmailTemplateDto,
  CreateEmailTemplateVariableDto,
  UpdateEmailTemplateDto,
  UpdateEmailTemplateVariableDto,
} from './dto/email-template.dto';
import { EmailTemplatesService } from './email-templates.service';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
// `monitor` es el moderador: edita las plantillas de moderación del registro,
// que son de plataforma (ver `scopeDoctorId` en el servicio).
@Roles('doctor', 'empresa', 'superadmin', 'monitor')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get('meta')
  meta(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.meta(user);
  }

  @Get('variables')
  listVariables(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.listVariables(user);
  }

  /** Plantilla activa de ese kind, o su contenido por defecto si el doctor
   * no ha configurado ninguna — usada por el selector de eventos del editor. */
  @Get('by-kind/:kind')
  getByKind(@CurrentUser() user: JwtPayload, @Param('kind') kind: string) {
    return this.emailTemplatesService.getByKindOrDefault(user, kind);
  }

  @Post('variables')
  createVariable(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEmailTemplateVariableDto,
  ) {
    return this.emailTemplatesService.createVariable(user, dto);
  }

  @Patch('variables/:id')
  updateVariable(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateVariableDto,
  ) {
    return this.emailTemplatesService.updateVariable(user, id, dto);
  }

  @Delete('variables/:id')
  deleteVariable(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.deleteVariable(user, id);
  }

  @Post('banners')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadBanner(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.emailTemplatesService.uploadBanner(user, file);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.list(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.getOne(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.remove(user, id);
  }
}
