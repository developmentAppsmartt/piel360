import { Module } from '@nestjs/common';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AppointmentEmailService } from './appointment-email.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, EmailTemplatesModule],
  controllers: [AgendaController],
  providers: [AgendaService, AppointmentEmailService],
  exports: [AgendaService],
})
export class AgendaModule {}
