import type { AnalisisPiel360OutputItem } from '@piel360/shared';

/**
 * Métricas como `hd_pore`, `hd_wrinkle` o `hd_skin_type` devuelven varias
 * regiones (forehead, nose, cheek, whole...) bajo el mismo `type` — sin
 * incluir la región en la key de storage, cada región pisaría el archivo de
 * la anterior (`analyses/{id}/masks/{type}` sería la misma ruta para todas).
 * Usado tanto al subir (youcam-results.service.ts) como al firmar
 * (analyses.service.ts) para que ambos lados coincidan.
 */
export function youcamMaskKey(
  item: Pick<AnalisisPiel360OutputItem, 'type' | 'region'>,
): string {
  return item.region ? `${item.type}_${item.region}` : item.type;
}
