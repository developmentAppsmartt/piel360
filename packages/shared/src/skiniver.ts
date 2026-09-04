import type { RiskLevel } from "./enums.js";

/** Respuesta de `POST /validate` (INTEGRACIONES-IA.md §1.2). */
export interface SkiniverValidateResponse {
  isgood: boolean;
  prob: number;
  error?: string;
}

/** Item de `predict().topn[]`: diagnóstico diferencial (INTEGRACIONES-IA.md §1.3). */
export interface SkiniverDiagnosisCandidate {
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
   * concatenados — ver `parseSkiniverDescription` en el backend. */
  description?: string;
}

/** Respuesta de `POST /predict` (INTEGRACIONES-IA.md §1.3). */
export interface SkiniverPrediction {
  class: string;
  prob: number;
  risk: string;
  high_risk_prob?: number;
  colored_s3_url?: string;
  masked_s3_url?: string;
  topn: SkiniverDiagnosisCandidate[];
  error?: string;
  /** Mismo formato de texto libre que `SkiniverDiagnosisCandidate.description`. */
  description?: string;
  /** Código de lesión estilo ICD (ej. "Z00") — confirmado en respuestas reales,
   * no documentado en INTEGRACIONES-IA.md. */
  lesion_code?: string;
  /** Nombre de la enfermedad/categoría (más genérico que `class`) —
   * confirmado en respuestas reales, no documentado. */
  desease?: string;
}

/** Estructurado a partir del texto libre de `description` — ver
 * `apps/api/src/skiniver/skiniver-description.util.ts`. Expuesto por
 * `AnalysisImageUrlsService#withImageUrls` como `skiniverDiagnosis`. */
export interface SkiniverDiagnosisDetails {
  description: string | null;
  conclusion: {
    category: string | null;
    category_prob: number;
  };
  precise_diagnosis: string | null;
  treatment: string | null;
  advice: string | null;
  icd_code: string | null;
}

/** Artículo dentro de `GET /get_atlas_pages` (INTEGRACIONES-IA.md §1.4). */
export interface SkiniverAtlasArticle {
  article_url: string;
  code: string;
  image_url: string;
  risk: string;
  risk_level: RiskLevel;
  title_name: string;
}

export interface SkiniverAtlasCategory {
  title_name: string;
  description: string;
  image_url: string;
  risk: string;
  risk_level: RiskLevel;
  articles: SkiniverAtlasArticle[];
}

export interface SkiniverAtlasResponse {
  status: boolean;
  error: string | null;
  categories: SkiniverAtlasCategory[];
}
