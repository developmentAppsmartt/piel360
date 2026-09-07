import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ENCYCLOPEDIA_QUEUE } from '../analyses/queues';
import { SkiniverModule } from '../skiniver/skiniver.module';
import { EncyclopediaService } from './encyclopedia.service';
import { EncyclopediaSyncService } from './encyclopedia-sync.service';
import { EncyclopediaController } from './encyclopedia.controller';
import { EncyclopediaProcessor } from './encyclopedia.processor';

@Module({
  imports: [BullModule.registerQueue({ name: ENCYCLOPEDIA_QUEUE }), SkiniverModule],
  providers: [EncyclopediaService, EncyclopediaProcessor, EncyclopediaSyncService],
  controllers: [EncyclopediaController],
  exports: [EncyclopediaService],
})
export class EncyclopediaModule {}
