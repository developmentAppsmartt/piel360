import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../storage/storage.module';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [PrismaModule, OrganizationsModule, StorageModule, AppConfigModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
