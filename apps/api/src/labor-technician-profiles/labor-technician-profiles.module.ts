import { Module } from '@nestjs/common';
import { LaborTechnicianProfilesController } from './labor-technician-profiles.controller';
import { LaborTechnicianProfilesService } from './labor-technician-profiles.service';

@Module({
  controllers: [LaborTechnicianProfilesController],
  providers: [LaborTechnicianProfilesService],
  exports: [LaborTechnicianProfilesService],
})
export class LaborTechnicianProfilesModule {}
