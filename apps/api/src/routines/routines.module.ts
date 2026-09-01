import { Module } from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { RoutinesController } from './routines.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { AnalysisConditionsModule } from '../analysis-conditions/analysis-conditions.module';

@Module({
  imports: [
    PrismaModule,
    OrganizationsModule,
    StorageModule,
    AnalysisConditionsModule,
  ],
  providers: [RoutinesService],
  controllers: [RoutinesController],
})
export class RoutinesModule {}
