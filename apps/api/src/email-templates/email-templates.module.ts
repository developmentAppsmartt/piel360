import { Module, forwardRef } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { EmailAssetsController } from './email-assets.controller';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplateVariablesService } from './email-template-variables.service';
import { EmailTemplatesService } from './email-templates.service';

@Module({
  imports: [PrismaModule, forwardRef(() => OrganizationsModule), StorageModule],
  controllers: [EmailTemplatesController, EmailAssetsController],
  providers: [EmailTemplatesService, EmailTemplateVariablesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
