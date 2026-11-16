import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AvatarThumbBackfill } from './avatar-thumb-backfill';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [StorageModule],
  providers: [UsersService, AvatarThumbBackfill],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
