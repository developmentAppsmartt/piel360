import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Un producto va una sola vez por tratamiento (o grupo de sugeridos).
 * `exceptItemId`: al editar, el propio ítem no cuenta como repetido. */
export async function ensureProductNotInTreatment(
  prisma: PrismaService,
  treatmentId: bigint,
  productId: bigint,
  exceptItemId?: bigint,
) {
  const existing = await prisma.treatmentProduct.findFirst({
    where: {
      treatmentId,
      productId,
      ...(exceptItemId !== undefined ? { id: { not: exceptItemId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictException('Este producto ya está agregado');
  }
}
