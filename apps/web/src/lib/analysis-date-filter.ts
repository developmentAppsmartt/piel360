import { colombiaDateKey } from "@piel360/shared";

/** Filtro de fecha de la tabla de análisis. Las claves son días o meses de
 * Colombia (`YYYY-MM-DD` / `YYYY-MM`), como en los reportes. */
export type AnalysisDateFilter =
  | { mode: "day"; day: string }
  | { mode: "month"; month: string }
  | { mode: "range"; from: string; to: string };

export type AnalysisDateMode = AnalysisDateFilter["mode"];

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Sin esto, un análisis de las 21:00 de Bogotá caería en el día siguiente
 * (02:00 UTC). */
export function matchesAnalysisDate(
  createdAt: string,
  filter: AnalysisDateFilter | null,
): boolean {
  if (!filter) return true;
  const day = colombiaDateKey(new Date(createdAt));
  if (filter.mode === "day") return day === filter.day;
  if (filter.mode === "month") return day.slice(0, 7) === filter.month;
  return day >= filter.from && day <= filter.to;
}

function shortDay(key: string, withYear: boolean) {
  const [y, m, d] = key.split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

export function analysisDateFilterLabel(filter: AnalysisDateFilter | null) {
  if (!filter) return "Filtrar por fecha";
  if (filter.mode === "day") return shortDay(filter.day, true);
  if (filter.mode === "month") {
    const [y, m] = filter.month.split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }
  const sameYear = filter.from.slice(0, 4) === filter.to.slice(0, 4);
  return `${shortDay(filter.from, !sameYear)} – ${shortDay(filter.to, true)}`;
}
