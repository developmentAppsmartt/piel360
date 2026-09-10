/** Reexporta los cálculos de edad de piel desde @piel360/shared — promovidos
 * ahí para que apps/api los use al generar el PDF del reporte sin duplicar
 * lógica (ver apps/api/src/reports/report-pdf.service.ts). */
export {
  chronologicalAgeYears,
  skinAgeDifference,
  skinAgeDifferenceMessage,
  formatSignedYears,
} from "@piel360/shared";
