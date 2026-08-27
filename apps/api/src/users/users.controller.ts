import {
  Body,
  Controller,
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
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import type { JwtPayload } from '../auth/types';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.sub, file);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_user')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_user')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('admin/users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_user')
  update(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.usersService.update(id, dto);
  }
}
