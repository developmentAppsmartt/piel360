import { Module } from '@nestjs/common';
import { AnalysisImageUrlsService } from '../analyses/analysis-image-urls.service';
import { DoctorsModule } from '../doctors/doctors.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';

@Module({
  imports: [DoctorsModule, OrganizationsModule, StorageModule],
  providers: [PatientsService, AnalysisImageUrlsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
