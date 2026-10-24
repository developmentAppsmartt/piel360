import { randomBytes } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service';

/** TTL del token de recuperación de contraseña. */
export const PASSWORD_RESET_TTL_MINUTES = 30;

/** Token de un solo uso que consume `resetPassword`. Lo emiten los caminos que
 * prueban la identidad: el código por correo, el código por SMS, el enlace por
 * correo y la contraseña actual. */
export async function issuePasswordResetToken(
  prisma: PrismaService,
  email: string,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
  return token;
}
