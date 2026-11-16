import sharp from 'sharp';
import type { StorageService } from '../storage/storage.service';

/** 160 px: el doble del avatar más grande de las listas (80 px), para que se
 * vea nítido en pantallas de alta densidad. Pesa unos 5–10 KB. */
const THUMB_SIDE = 160;

export function avatarThumbKeyFor(avatarKey: string): string {
  return `${avatarKey.replace(/\.[^./]+$/, '')}-thumb.jpg`;
}

/** Recorte cuadrado centrado; `rotate()` aplica la orientación EXIF. */
export function buildAvatarThumb(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize(THUMB_SIDE, THUMB_SIDE, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}

/** Genera y sube la miniatura de `avatarKey`; devuelve su key. */
export async function uploadAvatarThumb(
  storage: StorageService,
  avatarKey: string,
  image: Buffer,
): Promise<string> {
  const key = avatarThumbKeyFor(avatarKey);
  await storage.upload(key, await buildAvatarThumb(image), 'image/jpeg');
  return key;
}
