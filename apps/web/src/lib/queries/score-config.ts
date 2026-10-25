"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalisisPiel360ScoreConfig } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

const KEY = ["doctor-score-config"] as const;
const EFFECTIVE_KEY = ["score-config", "effective"] as const;

/** La configuración que se aplica al ver un análisis: la del dueño de la
 * cuenta, también para los profesionales de su equipo (`/doctor/score-config`
 * solo responde al dueño). Es la misma que usa la app móvil. */
export function useEffectiveScoreConfig() {
  return useQuery({
    queryKey: EFFECTIVE_KEY,
    queryFn: () =>
      apiClientFetch<AnalisisPiel360ScoreConfig>("/auth/me/score-config"),
  });
}

export function useMyScoreConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClientFetch<AnalisisPiel360ScoreConfig>("/doctor/score-config"),
  });
}

export function useUpdateScoreConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: AnalisisPiel360ScoreConfig) =>
      apiClientFetch<AnalisisPiel360ScoreConfig>("/doctor/score-config", {
        method: "PUT",
        body: JSON.stringify(config),
      }),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      void qc.invalidateQueries({ queryKey: EFFECTIVE_KEY });
    },
  });
}
