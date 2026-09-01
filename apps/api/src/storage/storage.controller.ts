import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'path';
import { StorageService } from './storage.service';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Sirve archivos del disco local (fallback de S3 en desarrollo). */
  @Get('files/*path')
  serveLocal(@Param('path') path: string | string[], @Res() res: Response) {
    const parts = Array.isArray(path) ? path : String(path).split('/');
    const key = parts.map((p) => decodeURIComponent(p)).join('/');
    if (!key || key.includes('..')) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (!this.storage.localExists(key)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const stream = this.storage.openLocalFile(key);
    const mime = MIME[extname(key).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    stream.pipe(res);
  }
}
