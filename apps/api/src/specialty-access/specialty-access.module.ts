import { Global, Module } from '@nestjs/common';
import { SpecialtiesModule } from '../specialties/specialties.module';
import { SpecialtyAccessService } from './specialty-access.service';

@Global()
@Module({
  imports: [SpecialtiesModule],
  providers: [SpecialtyAccessService],
  exports: [SpecialtyAccessService],
})
export class SpecialtyAccessModule {}
