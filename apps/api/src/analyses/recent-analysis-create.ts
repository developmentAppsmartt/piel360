import { createHash } from 'node:crypto';

const WINDOW_MS = 2 * 60 * 1000;

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
  const hash = createHash('sha256').update(input.image).digest('hex');
  return `${input.userId}:${input.patientId}:${hash}`;
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
 * El proveedor cobra al abrir la tarea, antes de que exista la fila.
 * La segunda petición de la misma foto espera la primera y no vuelve a cobrar.
 * Si falla, se olvida para que el reintento sí salga.
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
