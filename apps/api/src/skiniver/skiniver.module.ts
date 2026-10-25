import { Module } from '@nestjs/common';
import { AnalisisDermaPiel360Service } from './skiniver.service';
import { AnalisisDermaPiel360Controller } from './skiniver.controller';

@Module({
  providers: [AnalisisDermaPiel360Service],
  controllers: [AnalisisDermaPiel360Controller],
  exports: [AnalisisDermaPiel360Service],
})
export class AnalisisDermaPiel360Module {}
