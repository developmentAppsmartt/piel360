export type PatientAnalysisSummary = {
  id: string;
  bodyRegion: string | null;
  aiDiagnosis: string | null;
  finalDiagnosis?: string | null;
  aiProbability?: number | null;
  isConfirmed?: boolean;
  imagePath?: string;
  imageUrl?: string | null;
  coloredUrl?: string | null;
  createdAt: string;
};
