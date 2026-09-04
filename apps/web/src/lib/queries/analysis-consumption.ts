"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type ConsumptionPool = {
  done: number;
  limit: number;
  available: number;
};

export type DailyConsumptionPoint = {
  date: string;
  aesthetic: number;
  derm: number;
};

export type DailyConsumptionRow = {
  date: string;
  aesthetic: number;
  derm: number;
  total: number;
  patients: number;
  professional: string;
};

export type AnalysisConsumptionResponse = {
  from: string;
  to: string;
  aesthetic: ConsumptionPool;
  derm: ConsumptionPool;
  daily: DailyConsumptionPoint[];
  rows: DailyConsumptionRow[];
};

export type ConsumptionRangeParams = {
  from?: string;
  to?: string;
};

function toQuery(params: ConsumptionRangeParams) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useAnalysisConsumption(params: ConsumptionRangeParams = {}) {
  return useQuery({
    queryKey: ["analyses", "consumption", params.from ?? null, params.to ?? null],
    queryFn: () =>
      apiClientFetch<AnalysisConsumptionResponse>(
        `/analyses/consumption${toQuery(params)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** YYYY-MM-DD en zona local. */
export function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function rangeForPreset(preset: "day" | "month"): ConsumptionRangeParams {
  const now = new Date();
  if (preset === "day") {
    const iso = toLocalIsoDate(now);
    return { from: iso, to: iso };
  }
  return rangeForMonthKey(toLocalMonthKey(now));
}

/** YYYY-MM en zona local. */
export function toLocalMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Primer y último día del mes (si es el mes actual, hasta hoy). */
export function rangeForMonthKey(yyyyMm: string): ConsumptionRangeParams {
  const [yRaw, mRaw] = yyyyMm.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!y || !m) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(now) };
  }
  const from = new Date(y, m - 1, 1);
  const lastOfMonth = new Date(y, m, 0);
  const now = new Date();
  const isCurrentMonth =
    y === now.getFullYear() && m === now.getMonth() + 1;
  const to = isCurrentMonth ? now : lastOfMonth;
  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) };
}
