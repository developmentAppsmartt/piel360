import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [StorageModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
