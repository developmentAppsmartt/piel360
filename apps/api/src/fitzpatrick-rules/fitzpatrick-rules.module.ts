import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { FitzpatrickRulesController } from './fitzpatrick-rules.controller';
import { FitzpatrickRecommendationsService } from './fitzpatrick-recommendations.service';
import { FitzpatrickRulesService } from './fitzpatrick-rules.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, StorageModule],
  providers: [FitzpatrickRulesService, FitzpatrickRecommendationsService],
  controllers: [FitzpatrickRulesController],
  exports: [FitzpatrickRecommendationsService],
})
export class FitzpatrickRulesModule {}
