import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { DoctorsService } from './doctors.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('doctors/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.doctorsService.requireDoctorByUserId(user.sub);
  }

  @Patch('doctors/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.updateMe(user.sub, dto);
  }

  @Get('admin/doctors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(id, dto);
  }
}
