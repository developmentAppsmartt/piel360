import type { RiskLevel } from "./enums.js";

/** Respuesta de `POST /validate` (INTEGRACIONES-IA.md §1.2). */
export interface AnalisisDermaPiel360ValidateResponse {
  isgood: boolean;
  prob: number;
  error?: string;
}

/** Item de `predict().topn[]`: diagnóstico diferencial (INTEGRACIONES-IA.md §1.3). */
export interface AnalisisDermaPiel360DiagnosisCandidate {
  class: string;
  /** Id interno Skiniver (ej. "2P_dysplastic_nevus"). */
  class_raw?: string;
  prob: number;
  risk: string;
  risk_level: RiskLevel;
  desease?: string;
  atlas_page_link?: string;
  /** Código de lesión / ICD cuando Skiniver lo envía por candidato. */
  lesion_code?: string;
  /** Texto libre con evaluación/conclusión/diagnóstico/tratamiento/consejo
   * concatenados — ver `parseAnalisisDermaPiel360Description` en el backend. */
  description?: string;
}

/** Respuesta de `POST /predict` (INTEGRACIONES-IA.md §1.3). */
export interface AnalisisDermaPiel360Prediction {
  class: string;
  prob: number;
  risk: string;
  high_risk_prob?: number;
  colored_s3_url?: string;
  masked_s3_url?: string;
  topn: AnalisisDermaPiel360DiagnosisCandidate[];
  error?: string;
  /** Mismo formato de texto libre que `AnalisisDermaPiel360DiagnosisCandidate.description`. */
  description?: string;
  /** Código de lesión estilo ICD (ej. "Z00") — confirmado en respuestas reales,
   * no documentado en INTEGRACIONES-IA.md. */
  lesion_code?: string;
  /** Nombre de la enfermedad/categoría (más genérico que `class`) —
   * confirmado en respuestas reales, no documentado. */
  desease?: string;
}

/** El descriptivo de UN diagnóstico, ya separado del texto libre. */
export interface AnalisisDermaPiel360DescriptiveText {
  /** El párrafo de "Evaluación de riesgos". */
  description: string | null;
  precise_diagnosis: string | null;
  treatment: string | null;
  advice: string | null;
}

/** Descriptivo de un candidato de `topn[]`, con lo que lo identifica. Cada
 * candidato trae su propio `description` en el JSON de Skiniver, así que se
 * parsea uno por uno y nunca se hereda el del principal. */
export interface AnalisisDermaPiel360CandidateDetails extends AnalisisDermaPiel360DescriptiveText {
  /** `class` crudo — sin traducir, para poder cruzarlo con `topn[]`. */
  class: string;
  class_raw: string | null;
  /** Nombre ya traducido para mostrar. */
  label: string;
  /** 0–100. */
  prob: number;
  /** Categoría ya traducida (`desease`). */
  category: string | null;
  risk_level: string | null;
  icd_code: string | null;
  atlas_page_link: string | null;
}

/** Textos de riesgo que Skiniver manda aparte de `description`. */
export interface AnalisisDermaPiel360RiskGuidance {
  title: string | null;
  level_title: string | null;
  description: string | null;
  suggestion: string | null;
  short_recommendation: string | null;
}

/** Estructurado a partir del texto libre de `description` — ver
 * `parseAnalisisDermaPiel360Description` en `skiniver-description.ts`. Expuesto por
 * `AnalysisImageUrlsService#withImageUrls` como `analisisDermaPiel360Diagnosis`. */
export interface AnalisisDermaPiel360DiagnosisDetails extends AnalisisDermaPiel360DescriptiveText {
  conclusion: {
    category: string | null;
    category_prob: number;
  };
  icd_code: string | null;
  /** Un elemento por `topn[]`, con SU propio descriptivo. */
  candidates: AnalisisDermaPiel360CandidateDetails[];
  risk: AnalisisDermaPiel360RiskGuidance;
}

/** Artículo dentro de `GET /get_atlas_pages` (INTEGRACIONES-IA.md §1.4). */
export interface AnalisisDermaPiel360AtlasArticle {
  article_url: string;
  code: string;
  image_url: string;
  risk: string;
  risk_level: RiskLevel;
  title_name: string;
}

export interface AnalisisDermaPiel360AtlasCategory {
  title_name: string;
  description: string;
  image_url: string;
  risk: string;
  risk_level: RiskLevel;
  articles: AnalisisDermaPiel360AtlasArticle[];
}

export interface AnalisisDermaPiel360AtlasResponse {
  status: boolean;
  error: string | null;
  categories: AnalisisDermaPiel360AtlasCategory[];
}
