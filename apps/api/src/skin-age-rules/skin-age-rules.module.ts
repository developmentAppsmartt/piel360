import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { SkinAgeRulesController } from './skin-age-rules.controller';
import { SkinAgeRecommendationsService } from './skin-age-recommendations.service';
import { SkinAgeRuleCatalogService } from './skin-age-rule-catalog.service';
import { SkinAgeRulesService } from './skin-age-rules.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, StorageModule],
  providers: [
    SkinAgeRulesService,
    SkinAgeRuleCatalogService,
    SkinAgeRecommendationsService,
  ],
  controllers: [SkinAgeRulesController],
  exports: [SkinAgeRecommendationsService],
})
export class SkinAgeRulesModule {}
