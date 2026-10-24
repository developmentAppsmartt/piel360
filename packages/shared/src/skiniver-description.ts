/** Única condición de la clase «Piel Sin Patología». */
const NO_PATHOLOGY_CLASS_RAW = "1B_skin";
const NO_PATHOLOGY_ADVICE = "Realizar nuevo análisis con Piel 360 periódicamente";
/** «Skinive», como sale en el texto, y el nombre completo. Escrito así para que
 * la palabra entera no aparezca si este módulo acaba en un chunk del web. */
const PROVIDER_NAME = /\bskinive(?:r)?\b/gi;

export interface ParsedAnalisisDermaPiel360Description {
  riskEvaluation: string;
  conclusionText: string;
  preciseDiagnosis: string;
  treatment: string;
  advice: string;
}

/**
 * Skiniver no manda diagnóstico/tratamiento/consejo como claves JSON
 * separadas — los manda concatenados dentro de `description`, tanto en la
 * predicción raíz como en CADA `topn[]`. Formato real observado:
 *
 *   Evaluación de riesgos: <párrafo>
 *    Conclusión:
 *   <prob>% <categoría>
 *
 *   Diagnóstico[ preciso]: <texto>
 *   Tratamiento: <texto>
 *   Consejo: <texto>
 *
 * Ojo con `Diagnóstico preciso`: NO es el nombre de una enfermedad, es cómo se
 * llegaría a un diagnóstico definitivo ("después de la dermatoscopia") o una
 * frase genérica ("sin patología"). No sirve para decidir a qué candidato
 * pertenece un texto — cada `topn[]` ya trae el suyo.
 *
 * El texto nombra al proveedor («Consejo: nueva revisión Skinive»), y eso no
 * puede llegar a pantalla: se cambia por la marca. Con `classRaw` de la clase
 * «Piel Sin Patología» el consejo es el que pidió el cliente, no el de la IA.
 *
 * Defensivo: si el formato cambia, devuelve `null` en vez de romper.
 */
export function parseAnalisisDermaPiel360Description(
  rawDescription: string | null | undefined,
  classRaw?: string | null,
): ParsedAnalisisDermaPiel360Description | null {
  if (!rawDescription?.trim()) return null;
  const description = rawDescription.replace(PROVIDER_NAME, "Piel 360");

  const riskEvaluation =
    description
      .match(
        /Evaluaci[oó]n\s+del?\s+riesgos?:\s*([\s\S]*?)(?=\n\s*Conclusi[oó]n:)/i,
      )?.[1]
      ?.trim() ?? "";
  const conclusionText =
    description
      .match(/Conclusi[oó]n:\s*([\s\S]*?)(?=\n\s*Diagn[oó]stico)/i)?.[1]
      ?.trim() ?? "";
  const preciseDiagnosis =
    description
      .match(/Diagn[oó]stico(?:\s+preciso)?:\s*([^\n]+)/i)?.[1]
      ?.trim() ?? "";
  const treatment =
    description.match(/Tratamiento:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
  const advice =
    classRaw?.trim() === NO_PATHOLOGY_CLASS_RAW
      ? NO_PATHOLOGY_ADVICE
      : (description.match(/Consejo:\s*([^\n]+)/i)?.[1]?.trim() ?? "");

  if (
    !riskEvaluation &&
    !conclusionText &&
    !preciseDiagnosis &&
    !treatment &&
    !advice
  ) {
    return null;
  }

  return {
    riskEvaluation,
    conclusionText,
    preciseDiagnosis,
    treatment,
    advice,
  };
}
