import { Module } from '@nestjs/common';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentRemindersCron } from './appointment-reminders.cron';
import { AppointmentsDailySummaryCron } from './appointments-daily-summary.cron';

@Module({
  imports: [
    PrismaModule,
    OrganizationsModule,
    EmailTemplatesModule,
    NotificationsModule,
  ],
  controllers: [AgendaController],
  providers: [
    AgendaService,
    AppointmentEmailService,
    AppointmentsDailySummaryCron,
    AppointmentRemindersCron,
  ],
  exports: [AgendaService],
})
export class AgendaModule {}
