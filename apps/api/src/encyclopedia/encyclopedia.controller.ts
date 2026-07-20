import { Controller, Get, Param, Query } from '@nestjs/common';
import { EncyclopediaService } from './encyclopedia.service';

@Controller('encyclopedia')
export class EncyclopediaController {
  constructor(private readonly encyclopediaService: EncyclopediaService) {}

  @Get()
  findAll() {
    return this.encyclopediaService.findAll();
  }

  // Antes de ':id' — si no, Nest matchearía "by-url" como el param :id.
  @Get('by-url')
  findByUrl(@Query('url') url: string) {
    return this.encyclopediaService.findByUrl(url);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.encyclopediaService.findOne(id);
  }
}
