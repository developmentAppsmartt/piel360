import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import {
  DoctorBrandingController,
  MyBrandingController,
  PublicBrandingController,
} from './branding.controller';
import { BrandingService } from './branding.service';
import {
  DoctorScoreConfigController,
  MyScoreConfigController,
} from './score-config.controller';
import { ScoreConfigService } from './score-config.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [
    DoctorBrandingController,
    MyBrandingController,
    PublicBrandingController,
    DoctorScoreConfigController,
    MyScoreConfigController,
  ],
  providers: [BrandingService, ScoreConfigService],
})
export class BrandingModule {}
