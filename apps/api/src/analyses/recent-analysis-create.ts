import { createHash } from 'node:crypto';
import type { Analysis } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const WINDOW_MS = 2 * 60 * 1000;

export function captureSha256(image: Buffer): string {
  return createHash('sha256').update(image).digest('hex');
}

/** Error permanente ya guardado en la fila. No es un análisis en curso. */
export function mensajeDeAnalisisFallido(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const body = raw as { error?: unknown; message?: unknown };
  if (!body.error) return null;
  return typeof body.message === 'string' && body.message
    ? body.message
    : 'Error en el análisis';
}

/** La fila de esta foto, si ya se abrió una tarea. */
export function buscarCaptura(
  prisma: PrismaService,
  input: {
    patientId: bigint;
    userId: bigint;
    providerId: bigint;
    captureSha256: string;
  },
): Promise<Analysis | null> {
  return prisma.analysis.findFirst({
    where: {
      patientId: input.patientId,
      userId: input.userId,
      providerId: input.providerId,
      captureSha256: input.captureSha256,
    },
    orderBy: { id: 'desc' },
  });
}

type Slot = {
  at: number;
  promise: Promise<{ analysisId: string }>;
};

const recent = new Map<string, Slot>();

/** La misma foto, el mismo paciente y el mismo usuario en una ventana corta. */
export function recentAnalysisKey(input: {
  userId: string;
  patientId: string;
  image: Buffer;
}): string {
  return `${input.userId}:${input.patientId}:${captureSha256(input.image)}`;
}

export function reuseRecentAnalysis(
  key: string,
): Promise<{ analysisId: string }> | null {
  const hit = recent.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > WINDOW_MS) {
    recent.delete(key);
    return null;
  }
  return hit.promise;
}

/**
 * Une las peticiones simultáneas de la misma foto para que solo la primera
 * hable con el proveedor. Si esa petición falla antes de guardar la tarea,
 * se olvida y un reintento puede salir. Si la tarea ya quedó guardada, la
 * fila (`buscarCaptura`) responde y no se abre otra.
 */
export function rememberRecentAnalysis(
  key: string,
  promise: Promise<{ analysisId: string }>,
): Promise<{ analysisId: string }> {
  const tracked = promise.then(
    (value) => value,
    (err: unknown) => {
      recent.delete(key);
      throw err;
    },
  );
  recent.set(key, { at: Date.now(), promise: tracked });
  return tracked;
}
