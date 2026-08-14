import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { StorageModule } from '../storage/storage.module';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [PrismaModule, DoctorsModule, StorageModule, AppConfigModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
