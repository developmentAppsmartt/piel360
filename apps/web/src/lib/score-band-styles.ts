import type { YoucamScoreBand } from "@piel360/shared";

/** Colores de los tres niveles de puntaje. Los comparten la pantalla de
 * Rangos de puntuación y la guía de puntajes de productos/tratamientos: si se
 * separan, el profesional parametriza con unos colores y lee el reporte con
 * otros. */
export const SCORE_BAND_LABELS: Record<YoucamScoreBand, string> = {
  regular: "Regular",
  promedio: "Promedio",
  buena: "Buena",
};

export const SCORE_BAND_STYLES: Record<
  YoucamScoreBand,
  { bar: string; chip: string }
> = {
  regular: { bar: "bg-rose-400", chip: "bg-rose-50 text-rose-700" },
  promedio: { bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
  buena: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
};
