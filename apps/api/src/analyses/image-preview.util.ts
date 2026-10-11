import sharp from 'sharp';

/** Lado mayor de la foto que se muestra en la app (la original pesa ~1,5 MB). */
const PREVIEW_MAX_SIDE = 1280;

export function previewKeyFor(imagePath: string): string {
  return `${imagePath.replace(/\.[^./]+$/, '')}-preview.jpg`;
}

/**
 * Misma proporción que la original para que las máscaras sigan alineadas.
 * `rotate()` aplica la orientación EXIF, que es como el teléfono muestra la original.
 */
export function buildImagePreview(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize({
      width: PREVIEW_MAX_SIDE,
      height: PREVIEW_MAX_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}
