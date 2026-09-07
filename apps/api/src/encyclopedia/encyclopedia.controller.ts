import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { EncyclopediaService } from './encyclopedia.service';
import { EncyclopediaSyncService } from './encyclopedia-sync.service';

@Controller('encyclopedia')
export class EncyclopediaController {
  constructor(
    private readonly encyclopediaService: EncyclopediaService,
    private readonly encyclopediaSync: EncyclopediaSyncService,
  ) {}

  @Get()
  findAll() {
    return this.encyclopediaService.findAll();
  }

  // Antes de ':id' — si no, Nest matchearía "by-url" como el param :id.
  @Get('by-url')
  findByUrl(@Query('url') url: string) {
    return this.encyclopediaService.findByUrl(url);
  }

  /** Encola el scrape de todo el catálogo del atlas (mismo trabajo que ya
   * corre solo, mensual, vía @Cron) — para forzarlo ahora sin esperar. */
  @Post('sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('update_encyclopedia_entry')
  sync() {
    return this.encyclopediaSync.syncAllArticles();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.encyclopediaService.findOne(id);
  }
}
