/** Reexporta los cálculos de YouCam desde @piel360/shared — promovidos ahí
 * para que apps/api los use al generar el PDF del reporte sin duplicar
 * lógica (ver apps/api/src/reports/report-pdf.service.ts). */
export {
  parseAnalisisPiel360Metrics,
  analisisPiel360OverallScore,
  analisisPiel360SkinAge,
  analisisPiel360SkinType,
  analisisPiel360MetricValue,
  analisisPiel360ScoreBand,
  analisisPiel360ScoreBandLabel,
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  analisisPiel360ScoresByType,
  type AnalisisPiel360ReportItem,
  type AnalisisPiel360RawResponse,
  type AnalisisPiel360Metric,
  type AnalisisPiel360ScoreBand,
} from "@piel360/shared";
