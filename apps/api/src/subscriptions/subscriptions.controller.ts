import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import type { JwtPayload } from '../auth/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me/subscriptions')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.findMine(BigInt(user.sub));
  }

  @Get('admin/subscriptions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('view_any_subscription')
  findAllAdmin() {
    return this.subscriptionsService.findAllAdmin();
  }

  @Post('admin/subscriptions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('create_subscription')
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.createManual(dto);
  }

  @Patch('admin/subscriptions/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('update_subscription')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @Delete('admin/subscriptions/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('delete_subscription')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
