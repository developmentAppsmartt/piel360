export interface ParsedSkiniverDescription {
  riskEvaluation: string;
  preciseDiagnosis: string;
  treatment: string;
  advice: string;
}

/**
 * Skiniver no manda diagnóstico/tratamiento/consejo como claves JSON
 * separadas — los manda todos concatenados dentro de `description` (tanto a
 * nivel de la predicción como por cada candidato de `topn[]`), con un
 * formato de texto fijo (confirmado contra respuestas reales, no
 * documentado en INTEGRACIONES-IA.md):
 *
 *   Evaluación de riesgos: <párrafo>
 *    Conclusión:
 *   <prob>% <class>
 *
 *   Diagnóstico[ preciso]: <texto>
 *   Tratamiento: <texto>
 *   Consejo: <texto>
 *
 * Defensivo a propósito: si Skiniver cambia el formato, devuelve `null` en
 * vez de reventar la respuesta del análisis — el `aiRawResponse` crudo
 * sigue disponible de todas formas.
 */
const DESCRIPTION_PATTERN =
  /Evaluación de riesgos:\s*([\s\S]*?)\n\s*Conclusión:[\s\S]*?Diagnóstico(?: preciso)?:\s*([^\n]+?)\s*\nTratamiento:\s*([^\n]+?)\s*\nConsejo:\s*([^\n]+?)\s*$/;

export function parseSkiniverDescription(
  description: string | null | undefined,
): ParsedSkiniverDescription | null {
  if (!description) return null;

  const match = description.match(DESCRIPTION_PATTERN);
  if (!match) return null;

  const [, riskEvaluation, preciseDiagnosis, treatment, advice] = match;
  return { riskEvaluation, preciseDiagnosis, treatment, advice };
}
