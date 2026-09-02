import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysisImageUrlsService } from '../analyses/analysis-image-urls.service';
import { DoctorsModule } from '../doctors/doctors.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SkinAgeRulesModule } from '../skin-age-rules/skin-age-rules.module';
import { StorageModule } from '../storage/storage.module';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';

@Module({
  imports: [AuthModule, DoctorsModule, OrganizationsModule, StorageModule, SkinAgeRulesModule],
  providers: [PatientsService, AnalysisImageUrlsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
