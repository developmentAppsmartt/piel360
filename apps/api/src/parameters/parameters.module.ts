import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParametersController } from './parameters.controller';
import { ParametersService } from './parameters.service';

@Module({
  imports: [PrismaModule],
  controllers: [ParametersController],
  providers: [ParametersService],
  exports: [ParametersService],
})
export class ParametersModule {}
