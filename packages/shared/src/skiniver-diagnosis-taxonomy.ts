/**
 * Taxonomía de diagnósticos de Skiniver para el reporte "Análisis clínico IA"
 * del panel del doctor (apps/api/src/doctor-reports + apps/web/src/components/reports).
 *
 * Skiniver NO expone ninguna categorización clase/enfermedad — solo devuelve
 * el nombre puntual del diagnóstico (`Analysis.aiDiagnosis`, ej. "Rosácea").
 * Esta tabla es una curación propia, armada cruzando el catálogo oficial de
 * `get_atlas_pages` (52 diagnósticos en 12 categorías, en ruso) con los
 * títulos reales en español ya scrapeados en `encyclopedia_entries` (mismo
 * atlas que consume apps/api/src/encyclopedia).
 *
 * Es best-effort: si en producción aparecen valores de `aiDiagnosis` que no
 * calzan exactamente (variaciones de tildes/mayúsculas ya se normalizan, pero
 * un nombre nuevo no), caen en "Otras" de forma segura — no rompen el
 * reporte. Vale la pena revisar esta tabla contra los valores reales de
 * `ai_diagnosis` en producción después de desplegar.
 *
 * "Piel Sin Patología" (resultado de "sin hallazgos") no es una enfermedad:
 * se excluye de los reportes por clase/enfermedad (no cae en "Otras"), pero
 * sí cuenta en los reportes de edad/tono de piel (esos describen a quién se
 * le hizo el análisis, no qué se le encontró).
 */

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes (marcas diacríticas combinantes tras NFD)
    .trim()
    .toLowerCase();
}

export const SKINIVER_NO_PATHOLOGY_DIAGNOSIS = "Piel Sin Patología";

export type SkiniverDiagnosisClass =
  | "inflammatory"
  | "infectious"
  | "tumors"
  | "annex"
  | "other";

export const SKINIVER_DIAGNOSIS_CLASS_DEFS: Record<
  SkiniverDiagnosisClass,
  { label: string; color: string }
> = {
  inflammatory: { label: "Enfermedades inflamatorias", color: "#f97316" },
  infectious: { label: "Enfermedades infecciosas", color: "#3b82f6" },
  tumors: { label: "Tumores de la piel", color: "#22c55e" },
  annex: { label: "Trastornos de anexos", color: "#a855f7" },
  other: { label: "Otras clases", color: "#94a3b8" },
};

export type SkiniverDiseaseBucket =
  | "acne"
  | "dermatitis"
  | "melasma"
  | "rosacea"
  | "psoriasis"
  | "eccema"
  | "tinia"
  | "verrugas"
  | "urticaria"
  | "otras";

export const SKINIVER_DISEASE_BUCKET_DEFS: Record<
  SkiniverDiseaseBucket,
  { label: string; color: string }
> = {
  acne: { label: "Acné", color: "#f97316" },
  dermatitis: { label: "Dermatitis", color: "#3b82f6" },
  // Skiniver no diagnostica melasma hoy — este bucket siempre da 0 con los
  // datos actuales. Se deja definido para calzar con el mockup del cliente.
  melasma: { label: "Melasma", color: "#a855f7" },
  rosacea: { label: "Rosácea", color: "#ec4899" },
  psoriasis: { label: "Psoriasis", color: "#ef4444" },
  eccema: { label: "Eccema", color: "#14b8a6" },
  tinia: { label: "Tiña", color: "#eab308" },
  verrugas: { label: "Verrugas", color: "#6366f1" },
  urticaria: { label: "Urticaria", color: "#0ea5e9" },
  otras: { label: "Otras", color: "#94a3b8" },
};

/** Diagnóstico puntual (nombre real en español) → clase + enfermedad. */
const DIAGNOSIS_MAP: Record<
  string,
  { class: SkiniverDiagnosisClass; disease: SkiniverDiseaseBucket }
> = {
  // Neoplasias benignas
  "nevus benigno": { class: "tumors", disease: "otras" },
  "nevus acral": { class: "tumors", disease: "otras" },
  "nevus papilomatoso": { class: "tumors", disease: "otras" },
  "halo nevus": { class: "tumors", disease: "otras" },
  "nevus de spitz": { class: "tumors", disease: "otras" },
  hemangioma: { class: "tumors", disease: "otras" },
  dermatofibroma: { class: "tumors", disease: "otras" },
  "granuloma piogeno": { class: "tumors", disease: "otras" },
  // Precáncer
  "nevus displasico": { class: "tumors", disease: "otras" },
  "nevus azul": { class: "tumors", disease: "otras" },
  lentigo: { class: "tumors", disease: "otras" },
  "queratosis actinica": { class: "tumors", disease: "otras" },
  "queratosis seborreica": { class: "tumors", disease: "otras" },
  queratoacantoma: { class: "tumors", disease: "otras" },
  "enfermedad de bowen": { class: "tumors", disease: "otras" },
  // Cáncer de piel
  "carcinoma basocelular": { class: "tumors", disease: "otras" },
  "carcinoma de celulas escamosas": { class: "tumors", disease: "otras" },
  melanoma: { class: "tumors", disease: "otras" },
  "lentigo melanoma": { class: "tumors", disease: "otras" },
  // Micosis — cutáneas van a infecciosas, las de anexos (uña/pelo) a "anexos"
  "micosis cutanea": { class: "infectious", disease: "tinia" },
  "micosis cutaneas": { class: "infectious", disease: "tinia" },
  // Nombres reales del clasificador (`2G_skin_mycosis`, `2PS_shining_versicolor`),
  // que no coinciden con el wording del atlas. Sin estos alias caían en
  // "Otras"/"other" y el reporte no mostraba ninguna infección por hongos.
  "micosis de la piel": { class: "infectious", disease: "tinia" },
  "versicolor brillante": { class: "infectious", disease: "tinia" },
  "pitiriasis versicolor": { class: "infectious", disease: "tinia" },
  onicomicosis: { class: "annex", disease: "tinia" },
  tricomicosis: { class: "annex", disease: "tinia" },
  // Papuloescamosas
  "psoriasis vulgar": { class: "inflammatory", disease: "psoriasis" },
  "psoriasis pustulosa": { class: "inflammatory", disease: "psoriasis" },
  "dermatitis seborreica": { class: "inflammatory", disease: "dermatitis" },
  "liquen plano": { class: "inflammatory", disease: "otras" },
  "liquen de devergie": { class: "inflammatory", disease: "otras" },
  "pitiriasis rosada": { class: "inflammatory", disease: "otras" },
  "liquen nitidus": { class: "inflammatory", disease: "otras" },
  "liquen lineal": { class: "inflammatory", disease: "otras" },
  // Enfermedades virales
  "papiloma cutaneo": { class: "infectious", disease: "verrugas" },
  "verruga comun": { class: "infectious", disease: "verrugas" },
  "verruga plana": { class: "infectious", disease: "verrugas" },
  "verruga plantar": { class: "infectious", disease: "verrugas" },
  "molusco contagioso": { class: "infectious", disease: "otras" },
  // Infecciones herpéticas
  "herpes simple": { class: "infectious", disease: "otras" },
  "herpes genital": { class: "infectious", disease: "otras" },
  "herpes zoster": { class: "infectious", disease: "otras" },
  varicela: { class: "infectious", disease: "otras" },
  // Acné
  "acne vulgar": { class: "inflammatory", disease: "acne" },
  "acne pustuloso": { class: "inflammatory", disease: "acne" },
  "acne quistico": { class: "inflammatory", disease: "acne" },
  "comedon cerrado": { class: "inflammatory", disease: "acne" },
  "comedon abierto": { class: "inflammatory", disease: "acne" },
  milium: { class: "inflammatory", disease: "acne" },
  // "Acné común" es el nombre real que devuelve el modelo de Skiniver en
  // producción — no coincide textual con "Acné vulgar" del atlas (52
  // diagnósticos oficiales). Confirmado contra datos reales; se deja como
  // alias explícito en vez de asumir que el atlas y el clasificador usan
  // siempre el mismo wording.
  "acne comun": { class: "inflammatory", disease: "acne" },
  rosacea: { class: "inflammatory", disease: "rosacea" },
  // Dermatitis
  "dermatitis atopica": { class: "inflammatory", disease: "dermatitis" },
  dermatitis: { class: "inflammatory", disease: "dermatitis" },
  // Eccema / Urticaria / Eritema
  eccema: { class: "inflammatory", disease: "eccema" },
  "urticaria alergica": { class: "inflammatory", disease: "urticaria" },
  urticaria: { class: "inflammatory", disease: "urticaria" },
  "eritema centrifugo anular": { class: "inflammatory", disease: "otras" },
};

/** `null` para "sin diagnóstico" o "Piel Sin Patología" — el caller decide
 * excluirlo (reportes de clase/enfermedad) o no (reportes demográficos). */
export function isNoPathologyDiagnosis(aiDiagnosis: string | null | undefined): boolean {
  if (!aiDiagnosis) return false;
  return normalize(aiDiagnosis) === normalize(SKINIVER_NO_PATHOLOGY_DIAGNOSIS);
}

export function classifyDiagnosisClass(
  aiDiagnosis: string | null | undefined,
): SkiniverDiagnosisClass | null {
  if (!aiDiagnosis || isNoPathologyDiagnosis(aiDiagnosis)) return null;
  return DIAGNOSIS_MAP[normalize(aiDiagnosis)]?.class ?? "other";
}

export function classifyDiseaseBucket(
  aiDiagnosis: string | null | undefined,
): SkiniverDiseaseBucket | null {
  if (!aiDiagnosis || isNoPathologyDiagnosis(aiDiagnosis)) return null;
  return DIAGNOSIS_MAP[normalize(aiDiagnosis)]?.disease ?? "otras";
}

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
export const SKINIVER_AGE_BUCKETS: { key: string; label: string; color: string }[] = [
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
// Skiniver agrupa cada diagnóstico bajo una categoría propia ("Acné",
// "Dermatitis", "Lesiones benignas"…). A diferencia de DIAGNOSIS_MAP, que es
// curación nuestra por nombre y se desfasa cuando el modelo agrega un
// diagnóstico, esta categoría viene en la respuesta: se usa tal cual y solo se
// le asigna color. Un valor nuevo cae en la paleta de reserva, no se pierde.

const CATEGORY_COLORS: Record<string, string> = {
  acne: "#f97316",
  dermatitis: "#3b82f6",
  eccema: "#14b8a6",
  "lesiones benignas": "#22c55e",
  "infecciones por hongos": "#eab308",
  "trastornos papuloescamosos": "#a855f7",
  "condiciones precancerosas": "#ec4899",
  cancer: "#ef4444",
  "enfermedades virales": "#6366f1",
  "infecciones herpeticas": "#0ea5e9",
  urticaria: "#8b5cf6",
  rosacea: "#db2777",
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
export function skiniverCategoryColor(category: string): string {
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

export type SkiniverGender = "male" | "female" | "unknown";

/** `Patient.gender` es texto libre. Misma lista que apps/web/src/lib/body-model.ts,
 * promovida acá porque ahora el reporte la necesita del lado del servidor. */
export function normalizeGender(value: string | null | undefined): SkiniverGender {
  if (!value) return "unknown";
  const v = normalize(value);
  if (["female", "f", "femenino", "femenina", "mujer"].includes(v)) return "female";
  if (["male", "m", "masculino", "hombre"].includes(v)) return "male";
  return "unknown";
}
