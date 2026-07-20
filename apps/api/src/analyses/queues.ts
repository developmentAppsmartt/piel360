export const ANALYSIS_IMAGES_QUEUE = 'analysis-images';
export const ENCYCLOPEDIA_QUEUE = 'encyclopedia';

export interface AnalysisImagesJobData {
  analysisId: string;
  coloredUrl?: string;
  maskedUrl?: string;
}

export interface EncyclopediaJobData {
  url: string;
}
