import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/types';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateGatewayConfigDto } from './dto/create-gateway-config.dto';
import { UpdateGatewayConfigDto } from './dto/update-gateway-config.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('admin/gateway-configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createGatewayConfig(@Body() dto: CreateGatewayConfigDto) {
    return this.paymentsService.createGatewayConfig(dto);
  }

  @Get('admin/gateway-configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listGatewayConfigs() {
    return this.paymentsService.listGatewayConfigs();
  }

  @Patch('admin/gateway-configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateGatewayConfig(
    @Param('id') id: string,
    @Body() dto: UpdateGatewayConfigDto,
  ) {
    return this.paymentsService.updateGatewayConfig(id, dto);
  }

  @Post('wompi/checkout')
  @UseGuards(JwtAuthGuard)
  createWompiCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.createWompiCheckout(dto, user);
  }
}
