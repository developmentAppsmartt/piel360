import { Module } from '@nestjs/common';
import { ModeratorsController } from './moderators.controller';
import { ModeratorsService } from './moderators.service';

@Module({
  controllers: [ModeratorsController],
  providers: [ModeratorsService],
  exports: [ModeratorsService],
})
export class ModeratorsModule {}
