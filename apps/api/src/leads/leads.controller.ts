import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto, UpdateLeadDto } from './dto/lead-admin.dto';
import { LeadsService } from './leads.service';

/** Sin auth: es el formulario de la landing pública. */
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateLeadDto) {
    await this.leads.create(dto);
    return { ok: true };
  }
}

@Controller('admin/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermission('admin.leads')
  list(@Query() query: ListLeadsQueryDto) {
    return this.leads.list(query);
  }

  @Patch(':id')
  @RequirePermission('admin.leads')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }
}
