import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('create_gateway_config')
  createGatewayConfig(@Body() dto: CreateGatewayConfigDto) {
    return this.paymentsService.createGatewayConfig(dto);
  }

  @Get('admin/gateway-configs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('view_any_gateway_config')
  listGatewayConfigs() {
    return this.paymentsService.listGatewayConfigs();
  }

  /** Los secretos en claro, a petición y solo para el superadmin: sirven para
   * comprobar contra el panel de Wompi qué cuenta está configurada. */
  @Get('admin/gateway-configs/:id/secrets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Header('Cache-Control', 'no-store')
  revealGatewaySecrets(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.revealGatewaySecrets(id, user.sub);
  }

  @Patch('admin/gateway-configs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_gateway_config')
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
