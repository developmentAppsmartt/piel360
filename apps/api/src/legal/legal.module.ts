import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/** Global: lo usan el registro (auth), el estado de cuenta y la creación de
 * análisis, que viven en módulos distintos. */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
