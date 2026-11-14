import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { PatientClinicalHistoryController } from './patient-clinical-history.controller';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';

@Module({
  imports: [PatientsModule],
  providers: [PatientClinicalHistoryService],
  controllers: [PatientClinicalHistoryController],
})
export class PatientClinicalHistoryModule {}
