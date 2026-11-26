import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * El correo de la ficha del paciente es también su correo de inicio de
 * sesión. Antes la edición solo cambiaba `patients.email`: el paciente seguía
 * entrando con el viejo y «Olvidé mi contraseña» con el nuevo no enviaba nada
 * (pasó con paciente4@piel360.com).
 *
 * Devuelve el correo normalizado que hay que guardar en la ficha y, si el
 * paciente tiene cuenta y el correo cambió, el que hay que poner en `users`.
 */
export async function resolvePatientEmailChange(
  prisma: PrismaService,
  patient: { userId: bigint | null; email: string | null },
  raw: string | null | undefined,
): Promise<{ patientEmail?: string | null; loginEmail?: string }> {
  if (raw === undefined) return {};
  const email = raw?.trim().toLowerCase() || null;
  if (!patient.userId) return { patientEmail: email };

  if (!email) {
    throw new BadRequestException(
      'El paciente tiene acceso a la app: su correo no puede quedar vacío.',
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: patient.userId },
    select: { email: true },
  });
  if (user?.email?.toLowerCase() === email) return { patientEmail: email };

  const taken = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      NOT: { id: patient.userId },
    },
    select: { id: true },
  });
  if (taken) throw new ConflictException('Ya existe una cuenta con ese email');
  return { patientEmail: email, loginEmail: email };
}
