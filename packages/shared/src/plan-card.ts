/** Paleta de colores para el header de las cards de plan. */
export const PLAN_HEADER_COLORS = [
  { id: "brand", label: "Azul marca", hex: "#1e5a9e" },
  { id: "sky", label: "Azul claro", hex: "#3b82c4" },
  { id: "navy", label: "Azul oscuro", hex: "#0f3d73" },
  { id: "teal", label: "Verde agua", hex: "#0f766e" },
  { id: "emerald", label: "Esmeralda", hex: "#059669" },
  { id: "amber", label: "Ámbar", hex: "#d97706" },
  { id: "rose", label: "Rosa", hex: "#e11d48" },
  { id: "slate", label: "Gris", hex: "#334155" },
] as const;

export type PlanHeaderColorId = (typeof PLAN_HEADER_COLORS)[number]["id"];

export const DEFAULT_PLAN_HEADER_COLOR: PlanHeaderColorId = "brand";

export function resolvePlanHeaderColor(
  value: string | null | undefined,
): (typeof PLAN_HEADER_COLORS)[number] {
  const found = PLAN_HEADER_COLORS.find(
    (c) => c.id === value || c.hex.toLowerCase() === (value ?? "").toLowerCase(),
  );
  return found ?? PLAN_HEADER_COLORS[0];
}
