import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { AddTeamDoctorDto } from './dto/add-team-doctor.dto';
import { UpdateMemberPermissionsDto } from './dto/update-member-permissions.dto';
import { OrganizationsService } from './organizations.service';

@Controller()
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('organizations/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor', 'superadmin')
  getMine(@CurrentUser() user: JwtPayload) {
    return this.organizations.getMine(user.sub);
  }

  @Post('organizations/me/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  addDoctor(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddTeamDoctorDto,
  ) {
    return this.organizations.addDoctor(user.sub, dto);
  }

  @Patch('organizations/me/members/:memberId/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  updateMemberPermissions(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return this.organizations.updateMemberPermissions(
      user.sub,
      memberId,
      dto.permissions,
    );
  }

  @Delete('organizations/me/members/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.organizations.removeMember(user.sub, memberId);
  }

  @Get('organizations/me/map-markers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor', 'superadmin')
  getMyMapMarkers(
    @CurrentUser() user: JwtPayload,
    @Query('kind') kind?: 'doctor' | 'patient',
  ) {
    return this.organizations.getMapMarkersForDoctor(user.sub, user.role, kind);
  }

  @Get('admin/organizations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  listAll() {
    return this.organizations.listAllForAdmin();
  }

  @Get('admin/referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  listReferrals() {
    return this.organizations.listReferralsForAdmin();
  }
}
