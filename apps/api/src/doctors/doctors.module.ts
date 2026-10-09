import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { VerificationEmailService } from './verification-email.service';

@Module({
  imports: [AuthModule, StorageModule, MailModule],
  providers: [DoctorsService, VerificationEmailService],
  controllers: [DoctorsController],
  exports: [DoctorsService],
})
export class DoctorsModule {}
