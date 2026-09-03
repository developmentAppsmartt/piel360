import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SkinAgeRulesController } from './skin-age-rules.controller';
import { SkinAgeRulesService } from './skin-age-rules.service';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  providers: [SkinAgeRulesService],
  controllers: [SkinAgeRulesController],
  exports: [SkinAgeRulesService],
})
export class SkinAgeRulesModule {}
