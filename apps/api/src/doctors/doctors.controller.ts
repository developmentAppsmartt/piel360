import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { DoctorsService } from './doctors.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UpdateDoctorVerificationDto } from './dto/update-doctor-verification.dto';
import { UpdateDoctorAddressVerificationDto } from './dto/update-doctor-address-verification.dto';

@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('doctors/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.doctorsService.findMe(user.sub);
  }

  @Patch('doctors/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.updateMe(user.sub, dto);
  }

  @Post('doctors/me/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cedula', maxCount: 1 },
        { name: 'medicalRegistryDoc', maxCount: 1 },
        { name: 'diploma', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  uploadDocuments(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles()
    files: {
      cedula?: Express.Multer.File[];
      medicalRegistryDoc?: Express.Multer.File[];
      diploma?: Express.Multer.File[];
    },
  ) {
    return this.doctorsService.uploadRegistrationDocuments(user.sub, files);
  }

  @Get('admin/doctors')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_doctor')
  findAll() {
    return this.doctorsService.findAll();
  }

  /**
   * Cola de verificación por bandeja.
   * Path param (no query) para no perder el filtro: pending | active | rejected.
   */
  @Get('admin/verification/doctors/:status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  findPendingVerification(
    @Param('status') status?: string,
    @Query('status') statusQuery?: string,
  ) {
    const raw = status ?? (Array.isArray(statusQuery) ? statusQuery[0] : statusQuery);
    const normalized =
      raw === 'active' || raw === 'rejected' || raw === 'pending'
        ? raw
        : 'pending';
    return this.doctorsService.findForVerification(normalized);
  }

  @Get('admin/verification/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  verificationStats() {
    return this.doctorsService.verificationStats();
  }

  @Get('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_doctor')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_doctor')
  update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(id, dto);
  }

  @Patch('admin/doctors/:id/verification')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  updateVerification(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorVerificationDto,
  ) {
    return this.doctorsService.updateVerification(id, dto.status, dto.note);
  }

  @Patch('admin/doctors/:id/address-verification')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  updateAddressVerification(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorAddressVerificationDto,
  ) {
    return this.doctorsService.updateAddressVerification(id, dto);
  }
}
