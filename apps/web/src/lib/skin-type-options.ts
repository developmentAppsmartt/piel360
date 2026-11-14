import { ANALISIS_PIEL360_SKIN_TYPE_VALUES } from "@piel360/shared";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";

/** Los 8 biotipos del análisis estético, para elegir el alcance de una regla. */
export const SKIN_TYPE_OPTIONS = ANALISIS_PIEL360_SKIN_TYPE_VALUES.map((value) => ({
  value,
  label: analisisPiel360SkinTypeLabel(value),
}));
