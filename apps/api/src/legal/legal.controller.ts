import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import { AcceptLegalDto } from './dto/accept-legal.dto';
import { LegalService } from './legal.service';

@Controller('legal')
@UseGuards(JwtAuthGuard)
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  /** Pantalla «Aceptar y continuar» (web y app). */
  @Post('me/accept')
  @HttpCode(200)
  async accept(@Body() _dto: AcceptLegalDto, @CurrentUser() user: JwtPayload) {
    await this.legal.accept(BigInt(user.sub));
    return { ok: true };
  }
}
