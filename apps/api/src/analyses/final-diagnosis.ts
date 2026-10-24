import {
  analisisDermaPiel360DiagnosisLabel,
  findNosologyByCode,
  findNosologyByName,
  normalizeLabelKey,
  type AnalisisDermaPiel360DiagnosisCandidate,
} from '@piel360/shared';

export type FinalDiagnosisClass = {
  /** Id del clasificador (`class_raw`), p. ej. `3C_melanoma`. */
  code: string | null;
  /** Grupo de patologías, con el mismo nombre que la categoría de la IA. */
  category: string | null;
};

const SIN_CLASE: FinalDiagnosisClass = { code: null, category: null };

type RawPrediction = {
  class_raw?: string;
  topn?: AnalisisDermaPiel360DiagnosisCandidate[];
} | null;

function deCandidato(
  item: AnalisisDermaPiel360DiagnosisCandidate | undefined,
): FinalDiagnosisClass | null {
  if (!item?.class_raw) return null;
  return { code: item.class_raw, category: item.desease?.trim() || null };
}

function candidatoPorNombre(
  topn: AnalisisDermaPiel360DiagnosisCandidate[],
  name: string,
) {
  const key = normalizeLabelKey(name);
  return topn.find(
    (item) =>
      normalizeLabelKey(item.class ?? '') === key ||
      normalizeLabelKey(
        analisisDermaPiel360DiagnosisLabel(item.class, item.class_raw),
      ) === key,
  );
}

/**
 * Grupo y código del diagnóstico que dejó el profesional, para que los
 * reportes lo cuenten en vez del de la IA. El web manda el código; el móvil
 * solo el nombre, así que se busca también por nombre. Primero en el catálogo
 * de la lista de corrección y, si no está, entre los diagnósticos de apoyo del
 * propio análisis (la IA puede devolver una clase que el catálogo no tiene).
 *
 * Si es el mismo diagnóstico principal de la IA, o no hay forma de saber cuál
 * es, devuelve nulos: el reporte sigue contando el de la IA.
 */
export function resolverDiagnosticoFinal(
  aiRaw: unknown,
  name: string | null | undefined,
  code: string | null | undefined,
): FinalDiagnosisClass {
  const raw = aiRaw as RawPrediction;
  const resuelto = buscar(raw, name, code?.trim() || null);
  if (!resuelto || resuelto.code === raw?.class_raw) return SIN_CLASE;
  return resuelto;
}

function buscar(
  raw: RawPrediction,
  name: string | null | undefined,
  code: string | null,
): FinalDiagnosisClass | null {
  const topn = Array.isArray(raw?.topn) ? raw.topn : [];
  if (code) {
    const match = findNosologyByCode(code);
    if (match) return { code: match.item.id, category: match.category.name };
    return deCandidato(topn.find((item) => item.class_raw === code));
  }
  if (!name?.trim()) return null;
  const match = findNosologyByName(name);
  if (match) return { code: match.item.id, category: match.category.name };
  return deCandidato(candidatoPorNombre(topn, name));
}
