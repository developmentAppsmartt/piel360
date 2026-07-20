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
  prob: number;
  risk: string;
  risk_level: RiskLevel;
  desease?: string;
  atlas_page_link?: string;
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
