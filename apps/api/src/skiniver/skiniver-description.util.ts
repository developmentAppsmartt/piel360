export interface ParsedSkiniverDescription {
  riskEvaluation: string;
  conclusionText: string;
  preciseDiagnosis: string;
  treatment: string;
  advice: string;
}

/**
 * Skiniver no manda diagnóstico/tratamiento/consejo como claves JSON
 * separadas — los manda concatenados dentro de `description` (predicción
 * y cada `topn[]`). Formato real observado:
 *
 *   Evaluación del riesgo|de riesgos: <párrafo>
 *    Conclusión:
 *   <prob>% <categoría>
 *
 *   Diagnóstico[ preciso]: <texto>
 *   Tratamiento: <texto>
 *   Consejo: <texto>
 *
 * Defensivo: si el formato cambia, devuelve `null` en vez de romper.
 */
export function parseSkiniverDescription(
  description: string | null | undefined,
): ParsedSkiniverDescription | null {
  if (!description?.trim()) return null;

  const riskEvaluation =
    description
      .match(
        /Evaluaci[oó]n\s+del?\s+riesgos?:\s*([\s\S]*?)(?=\n\s*Conclusi[oó]n:)/i,
      )?.[1]
      ?.trim() ?? '';
  const conclusionText =
    description
      .match(
        /Conclusi[oó]n:\s*([\s\S]*?)(?=\n\s*Diagn[oó]stico)/i,
      )?.[1]
      ?.trim() ?? '';
  const preciseDiagnosis =
    description
      .match(/Diagn[oó]stico(?:\s+preciso)?:\s*([^\n]+)/i)?.[1]
      ?.trim() ?? '';
  const treatment =
    description.match(/Tratamiento:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  const advice = description.match(/Consejo:\s*([^\n]+)/i)?.[1]?.trim() ?? '';

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
