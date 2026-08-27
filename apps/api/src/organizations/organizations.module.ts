import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { StorageModule } from '../storage/storage.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [DoctorsModule, StorageModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
