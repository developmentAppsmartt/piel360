import type { FitzpatrickScale } from "@piel360/shared";

// docs/ai_fitzpatrick_skin_type.md — tabla de la escala Fitzpatrick, traducida.
// (La doc trae un typo: "Type V" aparece dos veces — corregido acá con el
// orden real I..VI de claro a oscuro.)
export const FITZPATRICK_TYPES: Record<
  FitzpatrickScale,
  { label: string; colorHex: string; reaction: string }
> = {
  I: { label: "Blanca", colorHex: "#f5d5c0", reaction: "Casi siempre se quema, nunca se broncea." },
  II: { label: "Beige", colorHex: "#e8bfa0", reaction: "Usualmente se quema, se broncea mínimamente." },
  III: { label: "Marrón claro", colorHex: "#c99873", reaction: "A veces se quema, se broncea gradualmente." },
  IV: { label: "Marrón medio", colorHex: "#a8754f", reaction: "Rara vez se quema, se broncea fácilmente." },
  V: { label: "Marrón oscuro", colorHex: "#6b4530", reaction: "Muy rara vez se quema." },
  VI: { label: "Negro", colorHex: "#3b2318", reaction: "Casi nunca se quema." },
};
