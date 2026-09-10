import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { ReportPdfService } from './report-pdf.service';
import { ReportEmailService } from './report-email.service';
import { PublicReportController } from './public-report.controller';

@Module({
  imports: [PrismaModule, StorageModule, EmailTemplatesModule],
  controllers: [PublicReportController],
  providers: [ReportPdfService, ReportEmailService],
  exports: [ReportEmailService, ReportPdfService],
})
export class ReportsModule {}
