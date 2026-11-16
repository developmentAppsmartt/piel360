import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import {
  AdminLeadsController,
  PublicLeadsController,
} from './leads.controller';
import { LeadNotificationService } from './lead-notification.service';
import { LeadsService } from './leads.service';

@Module({
  imports: [MailModule],
  controllers: [PublicLeadsController, AdminLeadsController],
  providers: [LeadsService, LeadNotificationService],
})
export class LeadsModule {}
