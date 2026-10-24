import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { esKeyDeBanner } from './banner-urls';

/** La firma vive un día; la redirección se cachea una hora, para que ningún
 * cliente guarde una redirección hacia una firma ya caducada. */
const FIRMA_SEGUNDOS = 60 * 60 * 24;
const CACHE_SEGUNDOS = 60 * 60;

/**
 * Sin auth — son las imágenes que van dentro de los correos, y un cliente de
 * correo no manda credenciales. Mismo patrón que `public/reports`: URL
 * estable que redirige a una firmada nueva. La key lleva un UUID, así que no
 * se puede enumerar.
 */
@Controller('public/email-assets')
@SkipThrottle()
export class EmailAssetsController {
  constructor(private readonly storage: StorageService) {}

  @Get('*path')
  async banner(@Param('path') path: string | string[], @Res() res: Response) {
    const partes = Array.isArray(path) ? path : String(path).split('/');
    const key = partes.join('/');
    if (!esKeyDeBanner(key)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    let url: string;
    try {
      url = await this.storage.getSignedUrl(key, FIRMA_SEGUNDOS);
    } catch {
      throw new NotFoundException('Imagen no encontrada');
    }
    res.setHeader('Cache-Control', `public, max-age=${CACHE_SEGUNDOS}`);
    return res.redirect(url);
  }
}
