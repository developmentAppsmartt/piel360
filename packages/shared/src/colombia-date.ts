/**
 * Días en hora de Colombia. El API corre en UTC y `created_at` se guarda en
 * UTC, así que cortar por `00:00Z` hace que «el 10/10» vaya del 9/10 a las
 * 19:00 al 10/10 a las 19:00 de Bogotá: los análisis de la noche caían en el
 * día siguiente del reporte. Colombia no tiene horario de verano, así que el
 * desfase es fijo.
 */
const OFFSET = "-05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` del día en Colombia. */
export function colombiaDateKey(date: Date): string {
  return new Date(date.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Inicio (00:00 de Colombia) del día `YYYY-MM-DD`. */
export function colombiaDayStart(key: string): Date {
  return new Date(`${key.slice(0, 10)}T00:00:00${OFFSET}`);
}
