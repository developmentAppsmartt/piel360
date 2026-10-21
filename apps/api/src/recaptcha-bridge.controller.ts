import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Sirve el HTML del captcha móvil fuera de /api.
 * Complementa useStaticAssets por si el path estático falla en el contenedor.
 */
@Controller()
export class RecaptchaBridgeController {
  @Get('recaptcha-bridge.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  serve(@Res() res: Response) {
    const file = join(process.cwd(), 'public', 'recaptcha-bridge.html');
    try {
      res.send(readFileSync(file, 'utf8'));
    } catch {
      res.status(404).type('text/plain').send('recaptcha-bridge.html no encontrado');
    }
  }
}
