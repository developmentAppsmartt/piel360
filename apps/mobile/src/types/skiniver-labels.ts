/**
 * ESPEJO de packages/shared/src/skiniver-labels.ts.
 *
 * Mobile no importa @piel360/shared (usa espejos locales), asi que este archivo
 * se genera copiando el de shared y sustituyendo sus dos imports por
 * definiciones locales. Si se toca el diccionario alla, hay que regenerarlo
 * aca: la prueba del diccionario corre contra la version de shared.
 */

type RiskLevel = 'low' | 'medium' | 'high';

/** Igual que normalizeLabelKey de packages/shared/src/skiniver-diagnosis-taxonomy.ts. */
function normalizeLabelKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Etiquetas en español para lo que devuelve Skiniver.
 *
 * Skiniver recibe `lang` (AnalysesService.create) y sí traduce el texto libre
 * de `description`, pero NO traduce `risk`, `class` ni `desease`: esos llegan
 * en el idioma canónico de la clase que haya predicho (inglés, y ruso en el
 * atlas). Además hay análisis ya guardados en `ai_raw_response` que no se
 * arreglan cambiando nada aguas arriba.
 *
 * La traducción se ancla a los dos campos que NO dependen del idioma y que ya
 * vienen persistidos:
 *   - `topn[].risk_level` → low | medium | high
 *   - `topn[].class_raw`  → id del clasificador (ej. "2P_dysplastic_nevus")
 *
 * Los nombres en español no son inventados: salen de cruzar el dump real de
 * `get_atlas_pages` (Piel360/example.json — 52 artículos en 12 categorías) con
 * los nombres ya curados en DIAGNOSIS_MAP de skiniver-diagnosis-taxonomy.ts.
 *
 * Todas las funciones son tolerantes: un valor desconocido se devuelve tal
 * cual, nunca vacío. Prefieren dejar pasar un nombre sin traducir antes que
 * perder el dato.
 */

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

/**
 * Variantes de texto de riesgo vistas en respuestas reales y en el atlas. Las
 * claves se normalizan al construir el mapa, no se escriben ya normalizadas:
 * en ruso `й` se descompone en NFD y pierde el breve, así que una clave cruda
 * nunca calzaría con lo que devuelve normalizeLabelKey().
 */
const RISK_TEXT_ALIAS_SOURCE: Record<string, RiskLevel> = {
  low: "low",
  "low risk": "low",
  bajo: "low",
  "riesgo bajo": "low",
  "низкий": "low",
  medium: "medium",
  "medium risk": "medium",
  moderate: "medium",
  middle: "medium",
  medio: "medium",
  "riesgo medio": "medium",
  moderado: "medium",
  "средний": "medium",
  high: "high",
  "high risk": "high",
  alto: "high",
  "riesgo alto": "high",
  "высокий": "high",
};

const RISK_TEXT_ALIASES = new Map<string, RiskLevel>(
  Object.entries(RISK_TEXT_ALIAS_SOURCE).map(([key, level]) => [
    normalizeLabelKey(key),
    level,
  ]),
);

/**
 * Etiqueta de riesgo en español. `riskLevel` (independiente del idioma) manda
 * sobre el texto; el texto solo se usa cuando el nivel no viene.
 */
export function skiniverRiskLabel(
  risk?: string | null,
  riskLevel?: string | null,
): string {
  const level = riskLevel?.trim().toLowerCase();
  if (level === "low" || level === "medium" || level === "high") {
    return RISK_LEVEL_LABELS[level];
  }

  const text = risk?.trim();
  if (!text) return "—";

  const alias = RISK_TEXT_ALIASES.get(normalizeLabelKey(text));
  return alias ? RISK_LEVEL_LABELS[alias] : text;
}

/**
 * Clave de búsqueda común para nombres de diagnóstico, slugs del atlas y
 * `class_raw`: sin tildes, en minúsculas, con `-`/`_` como espacios y sin el
 * prefijo de categoría del clasificador.
 *
 * Así las tres formas del mismo diagnóstico colapsan en una sola clave:
 *   "2P_dysplastic_nevus" · "id1-dysplastic-nevus" · "Dysplastic nevus"
 *     → "dysplastic nevus"
 *
 * El prefijo se detecta como "primer token que contiene un dígito" (`id1`,
 * `2ps`, `3v`): ningún nombre real de diagnóstico lleva dígitos. Se acepta
 * también el `id` pelado, porque dos slugs del atlas lo usan sin número
 * (`id-urticaria-allergic`, `id-erythema-annulare`).
 */
function diagnosisKey(value: string): string {
  return normalizeLabelKey(value)
    .replace(/[-_]+/g, " ")
    .replace(/^(?:[a-z]*\d+[a-z]*|id)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Los 52 diagnósticos del atlas. `es` es el nombre a mostrar; `keys` son las
 * formas alternativas con las que puede llegar (slug del atlas, sufijo de
 * `class_raw`, nombre en inglés). El propio `es` también se indexa, así que
 * traducir algo ya traducido es idempotente.
 */
const DIAGNOSES: { es: string; keys: string[] }[] = [
  // Lesiones benignas
  { es: "Nevus benigno", keys: ["benign nevus", "benign nevi", "simple nevus"] },
  { es: "Nevus acral", keys: ["acral nevus", "akralnyj nevus"] },
  {
    es: "Nevus papilomatoso",
    keys: ["papillomatous nevus", "papiloma nevus", "papilloma nevus"],
  },
  { es: "Halo nevus", keys: ["halo nevus", "galonevus", "halonevus"] },
  { es: "Nevus de Spitz", keys: ["spitz nevus", "nevus spitz"] },
  { es: "Hemangioma", keys: ["hemangioma"] },
  { es: "Dermatofibroma", keys: ["dermatofibroma"] },
  { es: "Granuloma piógeno", keys: ["pyogenic granuloma"] },
  // Condiciones precancerosas
  { es: "Nevus displásico", keys: ["dysplastic nevus"] },
  { es: "Nevus azul", keys: ["blue nevus"] },
  { es: "Lentigo", keys: ["lentigo"] },
  { es: "Queratosis actínica", keys: ["actinic keratosis"] },
  { es: "Queratosis seborreica", keys: ["seborrheic keratosis"] },
  { es: "Queratoacantoma", keys: ["keratoacanthoma", "keratoakantoma"] },
  {
    es: "Enfermedad de Bowen",
    keys: ["bowen disease", "bowens disease", "bouen", "bowen"],
  },
  // Cáncer
  { es: "Carcinoma basocelular", keys: ["basal cell carcinoma", "basalioma"] },
  { es: "Carcinoma de células escamosas", keys: ["squamous cell carcinoma"] },
  { es: "Melanoma", keys: ["melanoma"] },
  { es: "Lentigo melanoma", keys: ["lentigo melanoma", "lentigo maligna"] },
  // Infecciones por hongos
  {
    es: "Micosis de la piel",
    keys: [
      "skin mycosis",
      "mycosis smooth skin",
      "mycosis of smooth skin",
      "micosis cutanea",
    ],
  },
  {
    es: "Pitiriasis versicolor",
    keys: ["pityriasis versicolor", "tinea versicolor"],
  },
  { es: "Onicomicosis", keys: ["onychomycosis"] },
  { es: "Tricomicosis", keys: ["trichomycosis"] },
  // Trastornos papuloescamosos
  { es: "Psoriasis vulgar", keys: ["psoriasis vulgar", "psoriasis vulgaris"] },
  {
    es: "Psoriasis pustulosa",
    keys: ["psoriasis pustular", "pustular psoriasis"],
  },
  { es: "Liquen plano", keys: ["lichen planus"] },
  {
    es: "Liquen de Devergie",
    keys: ["red hair lichen", "pityriasis rubra pilaris", "devergie"],
  },
  { es: "Dermatitis seborreica", keys: ["seborrheic dermatitis"] },
  { es: "Pitiriasis rosada", keys: ["pink lichen", "pityriasis rosea"] },
  {
    es: "Liquen nítidus",
    keys: [
      "shining versicolor",
      "shining lichen",
      "lichen nitidus",
      "versicolor brillante",
    ],
  },
  { es: "Liquen lineal", keys: ["linear lichen", "lichen striatus"] },
  // Enfermedades virales
  { es: "Papiloma cutáneo", keys: ["papiloma", "papilloma", "skin papilloma"] },
  {
    es: "Verruga común",
    keys: ["wart vulgaris", "common wart", "verruca vulgaris"],
  },
  { es: "Verruga plana", keys: ["wart plane", "flat wart", "plane wart"] },
  { es: "Verruga plantar", keys: ["wart plantar", "plantar wart"] },
  { es: "Molusco contagioso", keys: ["molluscum contagiosum"] },
  // Infecciones herpéticas
  { es: "Herpes simple", keys: ["herpes simplex"] },
  { es: "Herpes genital", keys: ["herpes genitalis", "genital herpes"] },
  { es: "Herpes zóster", keys: ["herpes zoster", "shingles"] },
  {
    es: "Varicela",
    keys: ["herpes varicella zoster", "varicella", "chickenpox"],
  },
  // Acné
  { es: "Acné vulgar", keys: ["acne vulgaris", "acne vulgar", "acne comun"] },
  { es: "Acné pustuloso", keys: ["acne pustular", "pustular acne"] },
  { es: "Acné quístico", keys: ["acne cystic", "cystic acne"] },
  { es: "Comedón cerrado", keys: ["comedone closed", "closed comedone"] },
  { es: "Comedón abierto", keys: ["comedone open", "open comedone"] },
  { es: "Milium", keys: ["milium", "milia"] },
  { es: "Rosácea", keys: ["rosacea"] },
  // Dermatitis
  {
    es: "Dermatitis atópica",
    keys: ["atopic dermatitis", "atopicheskij dermatit"],
  },
  { es: "Dermatitis", keys: ["dermatitis", "dermatit"] },
  // Eccema
  { es: "Eccema", keys: ["eczema", "ekzema"] },
  // Urticaria
  {
    es: "Urticaria alérgica",
    keys: ["urticaria allergic", "allergic urticaria", "urticaria", "hives"],
  },
  // Eritema
  {
    es: "Eritema centrífugo anular",
    keys: ["erythema annulare", "erythema annulare centrifugum"],
  },
];

const DIAGNOSIS_LABELS = new Map<string, string>();
for (const entry of DIAGNOSES) {
  for (const key of [entry.es, ...entry.keys]) {
    const normalized = diagnosisKey(key);
    // El primero gana: el alias genérico "dermatitis" no debe pisar la entrada
    // propia de "Dermatitis atópica", que se declara antes.
    if (!DIAGNOSIS_LABELS.has(normalized)) {
      DIAGNOSIS_LABELS.set(normalized, entry.es);
    }
  }
}

/**
 * Nombre del diagnóstico en español. `classRaw` manda porque es el id interno
 * del clasificador y no cambia con el idioma; el nombre visible solo se usa
 * como respaldo. Si no se reconoce ninguno, se devuelve el nombre recibido.
 */
export function skiniverDiagnosisLabel(
  value?: string | null,
  classRaw?: string | null,
): string {
  const fromRaw = classRaw?.trim()
    ? DIAGNOSIS_LABELS.get(diagnosisKey(classRaw))
    : undefined;
  if (fromRaw) return fromRaw;

  const text = value?.trim();
  if (!text) return "";

  return DIAGNOSIS_LABELS.get(diagnosisKey(text)) ?? text;
}

/** Las 12 categorías del atlas (`desease`), en inglés y en ruso. */
const CATEGORY_ENTRIES: [string, string[]][] = [
  [
    "Lesiones benignas",
    [
      "benign formations",
      "benign neoplasms",
      "benign lesions",
      "Доброкачественные новообразования",
    ],
  ],
  [
    "Condiciones precancerosas",
    [
      "precancerous conditions",
      "pretumor conditions",
      "precancerous",
      "Предопухолевые состояния",
    ],
  ],
  [
    "Cáncer",
    [
      "malignant neoplasms",
      "skin cancer",
      "malignant",
      "cancer",
      "Злокачественные новообразования",
    ],
  ],
  [
    "Infecciones por hongos",
    [
      "fungal diseases",
      "fungal infections",
      "Грибковые заболевания",
    ],
  ],
  [
    "Trastornos papuloescamosos",
    [
      "papulosquamous disorders",
      "Папулосквамозные нарушения",
    ],
  ],
  [
    "Enfermedades virales",
    [
      "viral diseases",
      "Вирусные заболевания",
    ],
  ],
  [
    "Infecciones herpéticas",
    [
      "herpetic infections",
      "Герпетические инфекции",
    ],
  ],
  ["Acné", ["acne", "Акне"]],
  ["Dermatitis", ["dermatitis", "Дерматиты"]],
  ["Eccema", ["eczema", "Экзема"]],
  ["Urticaria", ["urticaria", "hives", "Крапивница"]],
  ["Eritema", ["erythema", "Эритема"]],
  ["Vitíligo", ["vitiligo", "Витилиго"]],
  [
    "Hidradenitis supurativa",
    ["hidradenitis suppurativa", "Гидраденит"],
  ],
];

const CATEGORY_LABELS = new Map<string, string>(
  CATEGORY_ENTRIES.flatMap(([es, keys]) =>
    [es, ...keys].map((key) => [normalizeLabelKey(key), es] as [string, string]),
  ),
);

/** Categoría (`desease`) en español; pasa de largo lo que no reconoce. */
export function skiniverCategoryLabel(desease?: string | null): string {
  const text = desease?.trim();
  if (!text) return "";
  return CATEGORY_LABELS.get(normalizeLabelKey(text)) ?? text;
}
