import type {
  AnalisisDermaPiel360UnitsResponse,
  AnalisisPiel360UnitsResponse,
} from "@/lib/queries/admin-bolsa-units";

export type MovementStatus = "Devolución" | "Activación" | "Consumo" | "Activa";

export type MovementRow = {
  id: string;
  unitType: "aesthetic" | "derm";
  unitLabel: string;
  rechargedAt: string;
  sortAt: number;
  quantity: number;
  delta: number;
  expiresAt: string;
  addedBy: string;
  status: MovementStatus;
  source: "analisispiel360" | "analisisdermapiel360";
  actionLabel: string;
  note: string | null;
  addedByEmail: string | null;
  targetId: string | null;
  dstActions: string[];
  rawKind: string | null;
};

export type BolsaTypeFilter = "all" | "aesthetic" | "derm";

const ACTION_LABELS: Record<string, string> = {
  subscription_credits: "Recarga suscripción",
  permanent_credits: "Compra de unidades",
  permanent_unit: "Compra de unidades",
  permanent_unit_2b: "Compra de unidades",
  subscription_unit: "Recarga de suscripción",
  trial_gift_api: "Regalo de prueba",
  renew: "Renovación",
  expire: "Vencimiento",
  sign_up_gift: "Regalo registro",
  subscriber_gift: "Regalo suscriptor",
  compensation_from_customer_service: "Compensación",
  subscription_return: "Cupo devuelto del plan",
  subscription_reserve: "Cupo asignado al plan",
};

export function historyActionLabel(action: string) {
  const failed = action.endsWith("_failed");
  const base = failed ? action.slice(0, -"_failed".length) : action;
  const known = ACTION_LABELS[base];
  const label =
    known ??
    (base.includes("fitzpatrick")
      ? "Análisis de fototipo"
      : base.includes("skin_analysis")
        ? "Análisis estético"
        : base.replaceAll("_", " "));
  return failed ? `Devolución · ${label}` : label;
}

export function analisisDermaPiel360MovementStatus(
  kind: string | undefined,
  quantity: number,
): MovementStatus {
  if (kind === "subscription_return") return "Devolución";
  if (kind === "subscription_reserve") return "Activación";
  if (quantity < 0) return "Consumo";
  return "Activa";
}

export function analisisPiel360MovementStatus(
  action: string,
  delta: number,
): MovementStatus {
  if (action === "subscription_return" || action.endsWith("_failed")) {
    return "Devolución";
  }
  if (action === "subscription_reserve") return "Activación";
  if (delta < 0) return "Consumo";
  return "Activa";
}

export function movementStatusBadgeClass(status: MovementStatus) {
  if (status === "Consumo" || status === "Activación") {
    return "bg-amber-100 text-amber-900 hover:bg-amber-100";
  }
  if (status === "Devolución") {
    return "bg-sky-100 text-sky-900 hover:bg-sky-100";
  }
  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

export function buildBolsaMovements(
  aestheticHistory: AnalisisPiel360UnitsResponse["history"] | undefined,
  dermHistory: AnalisisDermaPiel360UnitsResponse["history"] | undefined,
  typeFilter: BolsaTypeFilter,
): MovementRow[] {
  const liveRows: MovementRow[] = (aestheticHistory ?? [])
    .filter((h) => h.delta !== 0)
    .map((h) => {
      const actionLabel = historyActionLabel(h.action);
      return {
        id: `pc-${h.id}`,
        unitType: "aesthetic" as const,
        unitLabel: "Análisis estéticos / Fitzpatrick",
        rechargedAt: h.timestamp
          ? new Date(h.timestamp).toLocaleString("es-CO")
          : "—",
        sortAt: h.timestamp ? new Date(h.timestamp).getTime() : 0,
        quantity: Math.abs(h.delta),
        expiresAt: "—",
        addedBy: h.note?.trim()
          ? `${actionLabel} · ${h.note.trim()}`
          : actionLabel,
        status: analisisPiel360MovementStatus(h.action, h.delta),
        delta: h.delta,
        source: "analisispiel360" as const,
        actionLabel,
        note: h.note?.trim() || null,
        addedByEmail: null,
        targetId: h.targetId,
        dstActions: h.dstActions ?? [],
        rawKind: h.action,
      };
    });

  const dermRows: MovementRow[] = (dermHistory ?? []).map((h) => {
    const actionLabel = h.kind
      ? historyActionLabel(h.kind)
      : h.quantity < 0
        ? "Consumo"
        : "Recarga";
    return {
      id: `sv-${h.id}`,
      unitType: "derm" as const,
      unitLabel: "Análisis dermatológico",
      rechargedAt: new Date(h.createdAt).toLocaleString("es-CO"),
      sortAt: new Date(h.createdAt).getTime(),
      quantity: Math.abs(h.quantity),
      expiresAt: h.expiresAt
        ? new Date(h.expiresAt).toLocaleDateString("es-CO")
        : "—",
      addedBy: h.note?.trim() ? `${h.addedBy} · ${h.note.trim()}` : h.addedBy,
      status: analisisDermaPiel360MovementStatus(h.kind, h.quantity),
      delta: h.quantity,
      source: "analisisdermapiel360" as const,
      actionLabel,
      note: h.note?.trim() || null,
      addedByEmail: h.addedByEmail,
      targetId: null,
      dstActions: [],
      rawKind: h.kind ?? null,
    };
  });

  const all = [...liveRows, ...dermRows].sort((a, b) => b.sortAt - a.sortAt);
  if (typeFilter === "all") return all;
  return all.filter((row) => row.unitType === typeFilter);
}
