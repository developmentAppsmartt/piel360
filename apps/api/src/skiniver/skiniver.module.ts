import { Module } from '@nestjs/common';
import { SkiniverService } from './skiniver.service';
import { SkiniverController } from './skiniver.controller';

@Module({
  providers: [SkiniverService],
  controllers: [SkiniverController],
  exports: [SkiniverService],
})
export class SkiniverModule {}
