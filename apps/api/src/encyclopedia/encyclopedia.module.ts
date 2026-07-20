import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ENCYCLOPEDIA_QUEUE } from '../analyses/queues';
import { EncyclopediaService } from './encyclopedia.service';
import { EncyclopediaController } from './encyclopedia.controller';
import { EncyclopediaProcessor } from './encyclopedia.processor';

@Module({
  imports: [BullModule.registerQueue({ name: ENCYCLOPEDIA_QUEUE })],
  providers: [EncyclopediaService, EncyclopediaProcessor],
  controllers: [EncyclopediaController],
  exports: [EncyclopediaService],
})
export class EncyclopediaModule {}
