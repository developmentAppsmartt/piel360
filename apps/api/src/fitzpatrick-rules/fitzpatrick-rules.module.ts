import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { FitzpatrickRulesController } from './fitzpatrick-rules.controller';
import { FitzpatrickRulesService } from './fitzpatrick-rules.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, StorageModule],
  providers: [FitzpatrickRulesService],
  controllers: [FitzpatrickRulesController],
  exports: [FitzpatrickRulesService],
})
export class FitzpatrickRulesModule {}
