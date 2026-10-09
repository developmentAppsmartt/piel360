/**
 * Taxonomía de diagnósticos de Skiniver para el reporte "Análisis clínico IA"
 * del panel del doctor (apps/api/src/doctor-reports + apps/web/src/components/reports).
 *
 * Skiniver NO expone ninguna agrupación por clase — solo devuelve el nombre
 * puntual del diagnóstico (`Analysis.aiDiagnosis`, ej. "Rosácea") y su
 * categoría (`desease`).
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
 * se excluye de los reportes de clase y de condición (no cae en "Otras"), pero
 * sí cuenta en los reportes de edad/tono de piel (esos describen a quién se
 * le hizo el análisis, no qué se le encontró).
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

/**
 * Diagnóstico puntual (nombre real en español) → clase (grupo de patología).
 *
 * Solo agrupa en clases. El nivel de "enfermedad" del reporte ya no es una
 * curación propia: son las condiciones concretas que devolvió la IA, contadas
 * directamente en skiniver-report.service.ts.
 */
const DIAGNOSIS_MAP: Record<string, { class: SkiniverDiagnosisClass }> = {
  // Neoplasias benignas
  "nevus benigno": { class: "tumors" },
  "nevus acral": { class: "tumors" },
  "nevus papilomatoso": { class: "tumors" },
  "halo nevus": { class: "tumors" },
  "nevus de spitz": { class: "tumors" },
  hemangioma: { class: "tumors" },
  dermatofibroma: { class: "tumors" },
  "granuloma piogeno": { class: "tumors" },
  // Precáncer
  "nevus displasico": { class: "tumors" },
  "nevus azul": { class: "tumors" },
  lentigo: { class: "tumors" },
  "queratosis actinica": { class: "tumors" },
  "queratosis seborreica": { class: "tumors" },
  queratoacantoma: { class: "tumors" },
  "enfermedad de bowen": { class: "tumors" },
  // Cáncer de piel
  "carcinoma basocelular": { class: "tumors" },
  "carcinoma de celulas basales": { class: "tumors" },
  "carcinoma de celulas escamosas": { class: "tumors" },
  melanoma: { class: "tumors" },
  "lentigo melanoma": { class: "tumors" },
  // Micosis cutáneas. Las de uña y pelo no están acá: van en CLASS_OVERRIDES,
  // que es lo que las saca de su categoría.
  "micosis cutanea": { class: "infectious" },
  "micosis cutaneas": { class: "infectious" },
  // `2G_skin_mycosis` llega con un wording que no es el del atlas; sin este
  // alias caía en "other" y el reporte no mostraba ninguna infección por hongos.
  "micosis de la piel": { class: "infectious" },
  "pitiriasis versicolor": { class: "infectious" },
  // Papuloescamosas
  "psoriasis vulgar": { class: "inflammatory" },
  "psoriasis pustulosa": { class: "inflammatory" },
  "dermatitis seborreica": { class: "inflammatory" },
  "liquen plano": { class: "inflammatory" },
  "liquen de devergie": { class: "inflammatory" },
  "pitiriasis rosada": { class: "inflammatory" },
  "liquen nitidus": { class: "inflammatory" },
  "liquen lineal": { class: "inflammatory" },
  // Enfermedades virales
  "papiloma cutaneo": { class: "infectious" },
  "verruga comun": { class: "infectious" },
  "verruga plana": { class: "infectious" },
  "verruga plantar": { class: "infectious" },
  "molusco contagioso": { class: "infectious" },
  // Infecciones herpéticas
  "herpes simple": { class: "infectious" },
  "herpes genital": { class: "infectious" },
  "herpes zoster": { class: "infectious" },
  varicela: { class: "infectious" },
  // Acné
  "acne vulgar": { class: "inflammatory" },
  "acne pustuloso": { class: "inflammatory" },
  "acne quistico": { class: "inflammatory" },
  "comedon cerrado": { class: "inflammatory" },
  "comedon abierto": { class: "inflammatory" },
  milium: { class: "inflammatory" },
  // "Acné común" es el nombre real que devuelve el modelo de Skiniver en
  // producción — no coincide textual con "Acné vulgar" del atlas (52
  // diagnósticos oficiales). Confirmado contra datos reales; se deja como
  // alias explícito en vez de asumir que el atlas y el clasificador usan
  // siempre el mismo wording.
  "acne comun": { class: "inflammatory" },
  rosacea: { class: "inflammatory" },
  // Dermatitis
  "dermatitis atopica": { class: "inflammatory" },
  dermatitis: { class: "inflammatory" },
  // Eccema / Urticaria / Eritema
  eccema: { class: "inflammatory" },
  eczema: { class: "inflammatory" },
  "urticaria alergica": { class: "inflammatory" },
  urticaria: { class: "inflammatory" },
  "eritema centrifugo anular": { class: "inflammatory" },
};

/** La IA devuelve "sin patología" en varios idiomas, como diagnóstico y como
 * categoría (`desease`): cualquiera de esas formas queda fuera de los conteos. */
const NO_PATHOLOGY_KEYS = new Set(
  [
    SKINIVER_NO_PATHOLOGY_DIAGNOSIS,
    "Sin patología",
    "No pathologies",
    "No pathology",
    "Healthy skin",
    "Нет патологий",
  ].map(normalize),
);

export function isNoPathologyDiagnosis(aiDiagnosis: string | null | undefined): boolean {
  if (!aiDiagnosis) return false;
  return NO_PATHOLOGY_KEYS.has(normalize(aiDiagnosis));
}

export function isNoPathologyCategory(desease: string | null | undefined): boolean {
  return isNoPathologyDiagnosis(desease);
}

/**
 * Categoría de la IA (`desease`, ya traducida con skiniverCategoryLabel) →
 * clase. Respaldo para diagnósticos que el mapa no reconoce por nombre: el
 * modelo agrega diagnósticos y cambia su redacción, pero la categoría sigue
 * diciendo a qué grupo pertenecen.
 */
const CATEGORY_CLASS: Record<string, SkiniverDiagnosisClass> = {
  cancer: "tumors",
  "lesiones benignas": "tumors",
  "condiciones precancerosas": "tumors",
  "infecciones por hongos": "infectious",
  "enfermedades virales": "infectious",
  "infecciones herpeticas": "infectious",
  acne: "inflammatory",
  dermatitis: "inflammatory",
  eccema: "inflammatory",
  urticaria: "inflammatory",
  eritema: "inflammatory",
  "trastornos papuloescamosos": "inflammatory",
  "hidradenitis supurativa": "annex",
  // El vitíligo es un trastorno de la pigmentación: ninguna de las cinco
  // clases le corresponde. Se deja explícito para que se vea que está
  // decidido y no que falta la entrada.
  vitiligo: "other",
};

/**
 * Diagnósticos cuya clase NO es la de su categoría. Onicomicosis y
 * tricomicosis son micosis, pero de uña y de pelo: clínicamente pesan como
 * trastornos de anexos, que es lo que el reporte quiere mostrar.
 */
const CLASS_OVERRIDES: Record<string, SkiniverDiagnosisClass> = {
  onicomicosis: "annex",
  tricomicosis: "annex",
};

/**
 * `null` para "sin diagnóstico" o "sin patología" — el caller decide excluirlo.
 *
 * Manda la **categoría** que devuelve la IA, y el mapa de nombres es el
 * respaldo. Antes era al revés, y entonces una curación nuestra desfasada
 * pisaba el dato que sí manda el modelo: un alias equivocado bastaba para
 * mandar un diagnóstico a la clase de otra cosa. Con este orden, la clase
 * coincide siempre con la categoría que se ve en el donut de la misma
 * pantalla, y un diagnóstico nuevo no cae en "Otras" mientras su categoría
 * sea conocida.
 */
export function classifyDiagnosisClass(
  aiDiagnosis: string | null | undefined,
  options?: { label?: string | null; category?: string | null },
): SkiniverDiagnosisClass | null {
  if (!aiDiagnosis || isNoPathologyDiagnosis(aiDiagnosis)) return null;

  const override =
    CLASS_OVERRIDES[normalize(aiDiagnosis)] ??
    (options?.label ? CLASS_OVERRIDES[normalize(options.label)] : undefined);
  if (override) return override;

  const byCategory = options?.category
    ? CATEGORY_CLASS[normalize(options.category)]
    : undefined;
  if (byCategory) return byCategory;

  const byName =
    DIAGNOSIS_MAP[normalize(aiDiagnosis)]?.class ??
    (options?.label ? DIAGNOSIS_MAP[normalize(options.label)]?.class : undefined);
  return byName ?? "other";
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
