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
import { ClinicalPanelOrSuperadminRoles } from '../auth/clinical-panel.roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
@ClinicalPanelOrSuperadminRoles()
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get('meta')
  meta(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.meta(user.sub);
  }

  @Get('variables')
  listVariables(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.listVariables(user.sub);
  }

  @Post('variables')
  createVariable(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEmailTemplateVariableDto,
  ) {
    return this.emailTemplatesService.createVariable(user.sub, dto);
  }

  @Patch('variables/:id')
  updateVariable(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateVariableDto,
  ) {
    return this.emailTemplatesService.updateVariable(user.sub, id, dto);
  }

  @Delete('variables/:id')
  deleteVariable(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.deleteVariable(user.sub, id);
  }

  @Post('banners')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadBanner(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.emailTemplatesService.uploadBanner(user.sub, file);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.emailTemplatesService.list(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.getOne(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.emailTemplatesService.remove(user.sub, id);
  }
}
