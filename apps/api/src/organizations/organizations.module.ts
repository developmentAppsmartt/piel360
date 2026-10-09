import { Module, forwardRef } from '@nestjs/common';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { BillingModule } from '../billing/billing.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { SpecialtyAccessModule } from '../specialty-access/specialty-access.module';
import { StorageModule } from '../storage/storage.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrgContextService } from './org-context.service';
import { TeamInviteEmailService } from './team-invite-email.service';

@Module({
  imports: [
    DoctorsModule,
    StorageModule,
    SpecialtyAccessModule,
    BillingModule,
    // EmailTemplatesModule importa este módulo para OrgContextService, así
    // que la vuelta es un ciclo — mismo patrón que plans/subscriptions.
    forwardRef(() => EmailTemplatesModule),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgContextService, TeamInviteEmailService],
  exports: [OrganizationsService, OrgContextService],
})
export class OrganizationsModule {}
