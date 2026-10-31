import sharp from 'sharp';

/** YouCam mete un velo gris uniforme (61,61,61) en varias máscaras.
 * En «Puntaje de la piel» se apilan y la foto queda opaca. Se anula ese
 * alfa y se dejan las marcas de color. */
const VELO_MIN = 55;
const VELO_MAX = 70;

export async function quitarVeloGrisMascara(buffer: Buffer): Promise<Buffer> {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return buffer;
  }
  if (meta.format !== 'png' || !meta.width || !meta.height) return buffer;

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) return buffer;

  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;
    if (
      Math.abs(r - g) <= 2 &&
      Math.abs(g - b) <= 2 &&
      r >= VELO_MIN &&
      r <= VELO_MAX
    ) {
      data[i + 3] = 0;
      changed += 1;
    }
  }
  if (changed === 0) return buffer;

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
