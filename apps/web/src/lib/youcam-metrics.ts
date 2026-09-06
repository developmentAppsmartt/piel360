/** Reexporta los cálculos de YouCam desde @piel360/shared — promovidos ahí
 * para que apps/api los use al generar el PDF del reporte sin duplicar
 * lógica (ver apps/api/src/reports/report-pdf.service.ts). */
export {
  parseYoucamMetrics,
  youcamOverallScore,
  youcamSkinAge,
  youcamSkinType,
  youcamMetricValue,
  youcamScoreBand,
  youcamScoreBandLabel,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamScoresByType,
  type YoucamOutputItem,
  type YoucamRawResponse,
  type YoucamMetric,
  type YoucamScoreBand,
} from "@piel360/shared";
