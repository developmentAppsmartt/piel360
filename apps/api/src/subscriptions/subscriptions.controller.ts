import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me/subscriptions')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.findMine(BigInt(user.sub));
  }

  @Post('admin/subscriptions')
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.createManual(dto);
  }
}
