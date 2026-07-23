import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { StorageModule } from '../storage/storage.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [DoctorsModule, StorageModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
