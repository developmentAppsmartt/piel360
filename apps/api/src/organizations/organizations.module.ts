import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { SpecialtyAccessModule } from '../specialty-access/specialty-access.module';
import { StorageModule } from '../storage/storage.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrgContextService } from './org-context.service';

@Module({
  imports: [DoctorsModule, StorageModule, SpecialtyAccessModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgContextService],
  exports: [OrganizationsService, OrgContextService],
})
export class OrganizationsModule {}
