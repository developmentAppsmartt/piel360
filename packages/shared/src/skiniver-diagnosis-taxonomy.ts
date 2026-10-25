/**
 * Tablas del reporte de análisis dermatológicos del panel del doctor
 * (apps/api/src/doctor-reports + apps/web/src/components/reports): edad, tono
 * de piel, sexo y colores de las clases.
 *
 * Las clases son las del API (`desease`, el `title_name` de
 * `get_disease_classes`), no una agrupación propia: antes había cinco grupos
 * curados a mano («Enfermedades inflamatorias», «Tumores»…) y el cliente los
 * leía como clases mezcladas con enfermedades.
 */

/**
 * Clave estable para comparar etiquetas: sin tildes, sin espacios sobrantes y
 * en minúsculas. Exportada porque skiniver-labels.ts indexa su diccionario con
 * exactamente el mismo criterio — si las dos normalizaciones se separan, las
 * búsquedas dejan de calzar en silencio.
 */
export function normalizeLabelKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes tras NFD
    .trim()
    .toLowerCase();
}

const normalize = normalizeLabelKey;

// ─── Tono de piel (Fitzpatrick) ─────────────────────────────────────────────
//
// El mockup del cliente pide 4 grupos (I-II/III-IV/V-VI/VII-VIII), pero
// Patient.fitzpatrickType solo admite I-VI (la escala Fitzpatrick estándar no
// tiene VII-VIII) — se usan los 3 grupos que sí existen con datos reales.

export type SkinToneBucketKey = "claro" | "medio" | "moreno";

export const SKIN_TONE_BUCKET_DEFS: {
  key: SkinToneBucketKey;
  label: string;
  color: string;
  fitzpatrickTypes: string[];
}[] = [
  { key: "claro", label: "Claro (I-II)", color: "#fde68a", fitzpatrickTypes: ["I", "II"] },
  { key: "medio", label: "Medio (III-IV)", color: "#d97706", fitzpatrickTypes: ["III", "IV"] },
  { key: "moreno", label: "Moreno/Oscuro (V-VI)", color: "#78350f", fitzpatrickTypes: ["V", "VI"] },
];

export function skinToneBucketForFitzpatrick(
  fitzpatrickType: string | null | undefined,
): SkinToneBucketKey | null {
  if (!fitzpatrickType) return null;
  const found = SKIN_TONE_BUCKET_DEFS.find((b) =>
    b.fitzpatrickTypes.includes(fitzpatrickType.toUpperCase()),
  );
  return found?.key ?? null;
}

// ─── Edad ───────────────────────────────────────────────────────────────────

/** Rangos del mockup del cliente. Los usan tres widgets de la misma pantalla
 * (serie mensual, distribución total y el cruce por sexo), así que la escala
 * debe ser una sola: dos particiones distintas de edad en la misma página se
 * leen mal. El `CASE` de skiniver-reports.queries.ts refleja estos cortes. */
export const ANALISIS_DERMA_PIEL360_AGE_BUCKETS: { key: string; label: string; color: string }[] = [
  { key: "0-12", label: "0 - 12 años", color: "#22c55e" },
  { key: "13-20", label: "13 - 20 años", color: "#14b8a6" },
  { key: "21-30", label: "21 - 30 años", color: "#3b82f6" },
  { key: "31-40", label: "31 - 40 años", color: "#a855f7" },
  { key: "41-50", label: "41 - 50 años", color: "#f97316" },
  { key: "51-60", label: "51 - 60 años", color: "#ef4444" },
  { key: "61+", label: "61+ años", color: "#94a3b8" },
];

// ─── Categoría de la IA (`aiRawResponse.desease`) ───────────────────────────
//
// La clase viene en la respuesta de la IA: se usa tal cual y solo se le asigna
// color. Un valor nuevo cae en la paleta de reserva, no se pierde.

const CATEGORY_COLORS: Record<string, string> = {
  acne: "#f97316",
  dermatitis: "#3b82f6",
  eczema: "#14b8a6",
  "lesiones benignas": "#22c55e",
  "infecciones por hongos": "#eab308",
  "trastornos papuloescamosos": "#a855f7",
  "condiciones precancerosas": "#ec4899",
  cancer: "#ef4444",
  "enfermedades virales": "#6366f1",
  "infecciones por herpesvirus": "#0ea5e9",
  "urticaria alergica": "#8b5cf6",
  "eritema anular centrifugo": "#db2777",
  "hidradenitis supurativa": "#0891b2",
  vitiligo: "#65a30d",
  "piel sin patologia": "#64748b",
};

/** Paleta de reserva para categorías que el modelo agregue después. */
const FALLBACK_CATEGORY_COLORS = [
  "#0891b2",
  "#65a30d",
  "#c2410c",
  "#7c3aed",
  "#be123c",
  "#94a3b8",
];

/** Color estable por categoría: la misma categoría conserva su color entre
 * widgets y entre recargas (el fallback se elige por hash del nombre, no por
 * posición en la lista, que cambia con los filtros). */
export function analisisDermaPiel360CategoryColor(category: string): string {
  const known = CATEGORY_COLORS[normalize(category)];
  if (known) return known;
  let hash = 0;
  const key = normalize(category);
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (
    FALLBACK_CATEGORY_COLORS[hash % FALLBACK_CATEGORY_COLORS.length] ?? "#94a3b8"
  );
}

// ─── Género ─────────────────────────────────────────────────────────────────

export type AnalisisDermaPiel360Gender = "male" | "female" | "unknown";

/** `Patient.gender` es texto libre. Misma lista que apps/web/src/lib/body-model.ts,
 * promovida acá porque ahora el reporte la necesita del lado del servidor. */
export function normalizeGender(value: string | null | undefined): AnalisisDermaPiel360Gender {
  if (!value) return "unknown";
  const v = normalize(value);
  if (["female", "f", "femenino", "femenina", "mujer"].includes(v)) return "female";
  if (["male", "m", "masculino", "hombre"].includes(v)) return "male";
  return "unknown";
}
