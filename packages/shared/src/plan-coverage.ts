/**
 * Cobertura comercial del plan: condiciones estéticas (YouCam) y
 * clases/enfermedades dermatológicas (Skiniver) que se muestran en
 * el wizard admin y en el modal de la card del catálogo.
 */

export type PlanCoverageItem = {
  key: string;
  label: string;
  description: string;
};

export type PlanCoverage = {
  aesthetic: PlanCoverageItem[];
  dermatologyClasses: PlanCoverageItem[];
  dermatologyDiseases: PlanCoverageItem[];
  /** HTML enriquecido de la descripción (wizard). */
  aestheticHtml?: string;
  dermatologyClassesHtml?: string;
  dermatologyDiseasesHtml?: string;
};

export type PlanCoverageCatalogEntry = {
  key: string;
  label: string;
  /** Descripción comercial corta por defecto. */
  defaultDescription: string;
};

/** Condiciones estéticas seleccionables (orden del mockup comercial). */
export const PLAN_AESTHETIC_COVERAGE_CATALOG: PlanCoverageCatalogEntry[] = [
  {
    key: "hd_acne",
    label: "Acné",
    defaultDescription: "presencia de imperfecciones y lesiones inflamatorias.",
  },
  {
    key: "hd_age_spot",
    label: "Manchas",
    defaultDescription: "hiperpigmentación, melasma y léntigos.",
  },
  {
    key: "hd_wrinkle",
    label: "Arrugas",
    defaultDescription: "líneas de expresión y arrugas profundas.",
  },
  {
    key: "hd_pore",
    label: "Poros",
    defaultDescription: "visibilidad de poros en zona T y mejillas.",
  },
  {
    key: "hd_firmness",
    label: "Firmeza",
    defaultDescription: "pérdida de tonicidad y soporte cutáneo.",
  },
  {
    key: "hd_eye_bag",
    label: "Bolsas de ojos",
    defaultDescription: "volumen e hinchazón bajo los ojos.",
  },
  {
    key: "hd_dark_circle",
    label: "Ojeras",
    defaultDescription: "pigmentación y sombra periocular.",
  },
  {
    key: "hd_moisture",
    label: "Hidratación",
    defaultDescription: "nivel de hidratación aparente de la piel.",
  },
  {
    key: "hd_radiance",
    label: "Iluminación",
    defaultDescription: "brillo y luminosidad del rostro.",
  },
  {
    key: "hd_droopy_upper_eyelid",
    label: "Párpado superior caído",
    defaultDescription: "flacidez del párpado superior.",
  },
  {
    key: "hd_droopy_lower_eyelid",
    label: "Párpado inferior caído",
    defaultDescription: "flacidez del párpado inferior.",
  },
  {
    key: "hd_texture",
    label: "Textura",
    defaultDescription: "rugosidad y uniformidad superficial.",
  },
  {
    key: "hd_tear_trough",
    label: "Surco lagrimal",
    defaultDescription: "profundidad del surco bajo el ojo.",
  },
  {
    key: "hd_skin_type",
    label: "Biotipo",
    defaultDescription: "clasificación del tipo de piel (T/U).",
  },
  {
    key: "skin_age",
    label: "Edad de la piel",
    defaultDescription: "edad estimada de la piel en años.",
  },
];

export const PLAN_DERM_CLASS_COVERAGE_CATALOG: PlanCoverageCatalogEntry[] = [
  {
    key: "inflammatory",
    label: "Enfermedades inflamatorias",
    defaultDescription: "procesos inflamatorios cutáneos (acné, dermatitis, rosácea, etc.).",
  },
  {
    key: "infectious",
    label: "Enfermedades infecciosas",
    defaultDescription: "infecciones cutáneas como micosis o infecciones víricas.",
  },
  {
    key: "tumors",
    label: "Tumores de la piel",
    defaultDescription: "lesiones tumorales benignas y sospechosas.",
  },
  {
    key: "annex",
    label: "Trastornos de anexos",
    defaultDescription: "afecciones de uñas, pelo y glándulas.",
  },
  {
    key: "other",
    label: "Otras clases",
    defaultDescription: "otros hallazgos dermatológicos no clasificados arriba.",
  },
];

export const PLAN_DERM_DISEASE_COVERAGE_CATALOG: PlanCoverageCatalogEntry[] = [
  { key: "acne", label: "Acné", defaultDescription: "lesiones comedonianas e inflamatorias." },
  { key: "dermatitis", label: "Dermatitis", defaultDescription: "inflamación y irritación cutánea." },
  { key: "melasma", label: "Melasma", defaultDescription: "hiperpigmentación facial." },
  { key: "rosacea", label: "Rosácea", defaultDescription: "enrojecimiento y sensibilidad facial." },
  { key: "psoriasis", label: "Psoriasis", defaultDescription: "placas y descamación." },
  { key: "eccema", label: "Eccema", defaultDescription: "piel seca, pruriginosa e inflamada." },
  { key: "tinia", label: "Tiña", defaultDescription: "micosis cutáneas." },
  { key: "verrugas", label: "Verrugas", defaultDescription: "lesiones víricas de la piel." },
  { key: "urticaria", label: "Urticaria", defaultDescription: "ronchas y prurito." },
  { key: "otras", label: "Otras", defaultDescription: "otras enfermedades dermatológicas." },
];

export const EMPTY_PLAN_COVERAGE: PlanCoverage = {
  aesthetic: [],
  dermatologyClasses: [],
  dermatologyDiseases: [],
};

export function parsePlanCoverage(raw: unknown): PlanCoverage {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PLAN_COVERAGE };
  const obj = raw as Record<string, unknown>;
  return {
    aesthetic: normalizeCoverageList(obj.aesthetic),
    dermatologyClasses: normalizeCoverageList(obj.dermatologyClasses),
    dermatologyDiseases: normalizeCoverageList(obj.dermatologyDiseases),
    aestheticHtml:
      typeof obj.aestheticHtml === "string" ? obj.aestheticHtml : undefined,
    dermatologyClassesHtml:
      typeof obj.dermatologyClassesHtml === "string"
        ? obj.dermatologyClassesHtml
        : undefined,
    dermatologyDiseasesHtml:
      typeof obj.dermatologyDiseasesHtml === "string"
        ? obj.dermatologyDiseasesHtml
        : undefined,
  };
}

function normalizeCoverageList(raw: unknown): PlanCoverageItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanCoverageItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const description =
      typeof item.description === "string" ? item.description.trim() : "";
    if (!key || !label) continue;
    out.push({ key, label, description });
  }
  return out;
}

/** Texto multilínea `Label: descripción` (plano). */
export function formatCoverageDescription(items: PlanCoverageItem[]): string {
  return items
    .map((item) => {
      const desc = item.description.trim().replace(/\.$/, "");
      return desc ? `${item.label}: ${desc}.` : `${item.label}.`;
    })
    .join("\n");
}

/** HTML con etiqueta en negrita para el editor enriquecido. */
export function formatCoverageHtml(items: PlanCoverageItem[]): string {
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const desc = item.description.trim().replace(/\.$/, "");
      const body = desc ? `${desc}.` : "";
      return `<p><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(body)}</p>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Al togglear un ítem, regenera el HTML solo si el usuario no lo había
 * personalizado (o si el HTML actual coincide con el generado previo).
 */
export function syncCoverageHtml(
  items: PlanCoverageItem[],
  previousItems: PlanCoverageItem[],
  currentHtml: string | undefined,
): string {
  const expectedPrev = formatCoverageHtml(previousItems);
  const next = formatCoverageHtml(items);
  if (!currentHtml?.trim() || currentHtml === expectedPrev) return next;
  // HTML personalizado: intentar insertar/quitar el párrafo del ítem cambiado.
  const prevKeys = new Set(previousItems.map((i) => i.key));
  const nextKeys = new Set(items.map((i) => i.key));
  const added = items.find((i) => !prevKeys.has(i.key));
  const removed = previousItems.find((i) => !nextKeys.has(i.key));
  let html = currentHtml;
  if (removed) {
    const re = new RegExp(
      `<p[^>]*>\\s*<strong[^>]*>\\s*${escapeRegExp(removed.label)}\\s*:?</strong>[\\s\\S]*?</p>`,
      "i",
    );
    html = html.replace(re, "");
  }
  if (added) {
    const desc = added.description.trim().replace(/\.$/, "");
    const body = desc ? `${desc}.` : "";
    html += `<p><strong>${escapeHtml(added.label)}:</strong> ${escapeHtml(body)}</p>`;
  }
  return html;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function coverageHasItems(coverage: PlanCoverage | null | undefined): boolean {
  if (!coverage) return false;
  return (
    coverage.aesthetic.length > 0 ||
    coverage.dermatologyClasses.length > 0 ||
    coverage.dermatologyDiseases.length > 0
  );
}

export function toggleCoverageItem(
  selected: PlanCoverageItem[],
  catalog: PlanCoverageCatalogEntry[],
  key: string,
): PlanCoverageItem[] {
  const existing = selected.find((s) => s.key === key);
  if (existing) return selected.filter((s) => s.key !== key);
  const entry = catalog.find((c) => c.key === key);
  if (!entry) return selected;
  return [
    ...selected,
    {
      key: entry.key,
      label: entry.label,
      description: entry.defaultDescription,
    },
  ];
}
