import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
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

function assertModeratorPerm(
  user: JwtPayload,
  permission: string,
  message: string,
) {
  if (user.role === 'superadmin') return;
  if (!user.permissions?.includes(permission)) {
    throw new ForbiddenException(message);
  }
}

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

  /** Cola de verificación — ruta fuera de `admin/doctors/:id` para no colisionar. */
  @Get('admin/verification/doctors')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  findPendingVerification() {
    return this.doctorsService.findPendingVerification();
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
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    if (user.role === 'monitor') {
      const touchesSpecialty = dto.specialty !== undefined;
      const personalKeys = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'city',
        'docType',
        'docNumber',
        'birthDate',
        'gender',
      ] as const;
      const touchesPersonal = personalKeys.some((k) => dto[k] !== undefined);

      if (touchesSpecialty) {
        assertModeratorPerm(
          user,
          'change_specialty',
          'No tienes permiso para cambiar la profesión',
        );
      }
      if (touchesPersonal) {
        assertModeratorPerm(
          user,
          'edit_personal_data',
          'No tienes permiso para editar datos personales',
        );
      }
    }
    return this.doctorsService.update(id, dto);
  }

  @Patch('admin/doctors/:id/verification')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('validate_doctor')
  updateVerification(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorVerificationDto,
  ) {
    if (user.role === 'monitor') {
      if (dto.status === 'active' || dto.status === 'approved') {
        assertModeratorPerm(
          user,
          'approve_professional',
          'No tienes permiso para aprobar profesionales',
        );
      } else if (dto.status === 'rejected') {
        assertModeratorPerm(
          user,
          'reject_professional',
          'No tienes permiso para rechazar profesionales',
        );
      } else {
        assertModeratorPerm(
          user,
          'suspend_validation',
          'No tienes permiso para suspender la validación',
        );
      }
    }
    return this.doctorsService.updateVerification(id, dto.status);
  }
}
