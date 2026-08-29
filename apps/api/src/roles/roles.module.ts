import { Module } from '@nestjs/common';
import { SpecialtyAccessModule } from '../specialty-access/specialty-access.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [SpecialtyAccessModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
