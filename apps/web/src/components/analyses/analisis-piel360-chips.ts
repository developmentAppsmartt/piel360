/** Chips y zonas del resultado estético: qué métricas se muestran, con qué
 * puntaje y qué máscara. Sin React, para que el componente solo pinte. */
import { ANALISIS_PIEL360_METRIC_LABELS, analisisPiel360RegionLabel, analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import {
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  analisisPiel360MetricValue,
  analisisPiel360OverallScore,
  type AnalisisPiel360Metric,
} from "@/lib/youcam-metrics";

// hd_pore/hd_wrinkle/hd_skin_type traen varias regiones bajo el mismo `type`
// (ej. hd_wrinkle: forehead/glabellar/crowfeet/periocular/nasolabial/marionette/whole).
// El chip principal sigue mostrando "whole" (como antes), pero además expone
// `regions` para que el usuario pueda ver cada subcategoría — antes se perdían
// por completo, colapsadas a un solo chip por `type`.
const MULTI_REGION_TYPES = new Set(["hd_wrinkle", "hd_pore", "hd_skin_type"]);
export const DEFAULT_REGION = "whole";
/** Chips que no son máscaras YouCam: muestran la foto limpia. */
export const SKIN_AGE_TYPE = "skin_age";
export const FITZPATRICK_TYPE = "fitzpatrick";

// Capas superpuestas en el chip "Salud de la piel" (overview) — ojeras,
// firmeza, eritema, bolsas, surco, poros/manchas/arrugas general.
const OVERVIEW_LAYER_TYPES = [
  "hd_dark_circle",
  "hd_firmness",
  "hd_redness",
  "hd_eye_bag",
  "hd_tear_trough",
  "hd_pore",
  "hd_age_spot",
  "hd_wrinkle",
];

export type MetricRegionOption = {
  region: string;
  label: string;
  score: number | null;
  skinType: string | null;
  maskUrl: string | null;
};

export type MetricChip = {
  type: string;
  label: string;
  score: number | null;
  maskUrl: string | null;
  regions?: MetricRegionOption[];
};


function shortLabel(type: string): string {
  const full = ANALISIS_PIEL360_METRIC_LABELS[type] ?? type;
  if (full.length <= 12) return full;
  return full.split(" ")[0] ?? full;
}

/** A diferencia de `masks.find((x) => x.type === type)` (el bug original: toma
 * el primer mask con ese `type` sin mirar la región, mezclando por ejemplo la
 * imagen de "frente" con el puntaje de "general"), esto siempre matchea la
 * región exacta. */
function findMaskUrl(
  masks: AnalysisDetail["masks"],
  type: string,
  region: string | undefined,
): string | null {
  return masks.find((m) => m.type === type && m.region === region)?.url ?? null;
}

function buildRegionOptions(
  type: string,
  candidates: AnalisisPiel360Metric[],
  masks: AnalysisDetail["masks"],
  preferRaw: boolean,
): MetricRegionOption[] {
  const sorted = [...candidates].sort((a, b) => {
    const aWhole = (a.region ?? DEFAULT_REGION) === DEFAULT_REGION;
    const bWhole = (b.region ?? DEFAULT_REGION) === DEFAULT_REGION;
    if (aWhole === bWhole) return 0;
    return aWhole ? -1 : 1;
  });
  return sorted.map((m) => {
    const region = m.region ?? DEFAULT_REGION;
    return {
      region,
      label: analisisPiel360RegionLabel(region),
      score: analisisPiel360MetricValue(m, preferRaw),
      skinType: m.skinType,
      maskUrl: findMaskUrl(masks, type, m.region),
    };
  });
}

/** Mismo orden que la app móvil (AnalisisPiel360ResultsSection.tsx): Edad de la piel,
 * Puntaje de la piel, Biotipo, Fototipo y luego las métricas principales. */
export function buildChips(
  metrics: AnalisisPiel360Metric[],
  masks: AnalysisDetail["masks"],
  preferRaw: boolean,
  skinAge: number | null,
): MetricChip[] {
  const chips: MetricChip[] = [
    {
      type: SKIN_AGE_TYPE,
      label: "Edad de la piel",
      score: skinAge,
      maskUrl: null,
    },
    {
      type: "overview",
      label: "Puntaje de la piel",
      score: analisisPiel360OverallScore(metrics),
      maskUrl: null,
    },
  ];

  const skinTypeCandidates = metrics.filter((m) => m.type === "hd_skin_type");
  if (skinTypeCandidates.length > 0) {
    const whole =
      skinTypeCandidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
      skinTypeCandidates[0];
    chips.push({
      type: "hd_skin_type",
      label: "Biotipo",
      score: analisisPiel360MetricValue(whole, preferRaw),
      maskUrl: findMaskUrl(masks, "hd_skin_type", whole.region),
      regions:
        skinTypeCandidates.length > 1
          ? buildRegionOptions("hd_skin_type", skinTypeCandidates, masks, preferRaw)
          : undefined,
    });
  }

  // Siempre presente, aunque el paciente no tenga fototipo: mantiene el mismo
  // orden de categorías en todos los pacientes (igual que la app).
  chips.push({
    type: FITZPATRICK_TYPE,
    label: "Fototipo",
    score: null,
    maskUrl: null,
  });

  for (const type of ANALISIS_PIEL360_MAIN_METRIC_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ?? candidates[0];
    chips.push({
      type,
      label: shortLabel(type),
      score: analisisPiel360MetricValue(whole, preferRaw),
      maskUrl: findMaskUrl(masks, type, whole.region),
      regions:
        MULTI_REGION_TYPES.has(type) && candidates.length > 1
          ? buildRegionOptions(type, candidates, masks, preferRaw)
          : undefined,
    });
  }

  return chips;
}

/** URLs de las capas superpuestas del chip "Salud de la piel" — mismo
 * criterio whole/default que buildChips para elegir la región de cada tipo. */
export function buildOverviewMaskUrls(
  metrics: AnalisisPiel360Metric[],
  masks: AnalysisDetail["masks"],
): string[] {
  const urls: string[] = [];
  for (const type of OVERVIEW_LAYER_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ?? candidates[0];
    const url = findMaskUrl(masks, type, whole.region);
    if (url) urls.push(url);
  }
  return urls;
}

export function regionPillLabel(option: MetricRegionOption): string {
  if (option.skinType) return `${option.label} · ${analisisPiel360SkinTypeLabel(option.skinType)}`;
  if (option.score != null) return `${option.label} ${Math.round(option.score)}`;
  return option.label;
}
