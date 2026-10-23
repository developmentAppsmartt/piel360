"use client";

import { Microscope, Sparkles, SwatchBook, type LucideIcon } from "lucide-react";
import {
  PUBLIC_ANALYSIS_PROVIDER_SLUGS,
  type PublicAnalysisProviderSlug,
} from "@piel360/shared";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { useMyDoctorProfile } from "@/lib/queries/doctors";

export type NewAnalysisOption = {
  slug: PublicAnalysisProviderSlug;
  label: string;
  shortLabel: string;
  /** Texto corto de la tarjeta de accesos. */
  subtitle: string;
  /** Texto del modal «Nuevo análisis». */
  description: string;
  icon: LucideIcon;
  path: string;
};

/** Los tipos de análisis que se pueden iniciar desde la ficha del paciente.
 * Iconos iguales a los de los planes (`billing-plan-row.tsx`). */
export const NEW_ANALYSIS_OPTIONS: readonly NewAnalysisOption[] = [
  {
    slug: "analisisdermapiel360",
    label: ANALYSIS_PROVIDER_STATIC_LABELS.analisisdermapiel360,
    shortLabel: "Análisis Dermatológico",
    subtitle: "Piel y enfermedades",
    description:
      "Evalúa condiciones de la piel y posibles patologías dermatológicas.",
    icon: Microscope,
    path: "nuevo-analisis",
  },
  {
    slug: "analisispiel360",
    label: ANALYSIS_PROVIDER_STATIC_LABELS.analisispiel360,
    shortLabel: "Análisis Estético",
    subtitle: "Condición y apariencia",
    description:
      "Analiza la salud estética de la piel y sus signos de envejecimiento.",
    icon: Sparkles,
    path: "nuevo-analisis-analisispiel360",
  },
  {
    slug: "fitzpatrick",
    label: ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick,
    shortLabel: "Análisis de Fototipo",
    subtitle: "Tono de piel",
    description: "Determina el fototipo cutáneo y sus características.",
    icon: SwatchBook,
    path: "nuevo-analisis-fitzpatrick",
  },
];

export function newAnalysisHref(patientId: string, option: NewAnalysisOption) {
  return `/doctor/pacientes/${patientId}/${option.path}`;
}

/** Los tipos que el profesional tiene habilitados. El API ya manda los slugs
 * públicos, así que basta comparar. */
export function useAllowedAnalysisOptions(): readonly NewAnalysisOption[] {
  const doctorProfile = useMyDoctorProfile();
  const allowed: readonly string[] =
    doctorProfile.data?.allowedProviderSlugs ?? PUBLIC_ANALYSIS_PROVIDER_SLUGS;
  return NEW_ANALYSIS_OPTIONS.filter((option) => allowed.includes(option.slug));
}
