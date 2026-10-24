import { downloadCsv } from "@/lib/csv-export";
import type {
  AnalisisDermaPiel360Report,
  LifestyleReport,
  SkinHealthReport,
} from "@/lib/queries/doctor-reports";
import { sortCategories, type TopProblemsSort } from "./top-problems-table";

export type ReportTab =
  | "resumen"
  | "necesidades"
  | "top"
  | "dermatologico"
  | "nacimiento"
  | "mascotas"
  | "actividad"
  | "clinico";

type Row = (string | number | null)[];

export const LIFESTYLE_REPORT_TABS: ReportTab[] = [
  "nacimiento",
  "mascotas",
  "actividad",
  "clinico",
];

/** Qué datos hacen falta para exportar la pestaña (si no están, el botón se desactiva). */
export function canExportReport(
  tab: ReportTab,
  data: {
    skin?: SkinHealthReport;
    lifestyle?: LifestyleReport;
    derm?: AnalisisDermaPiel360Report;
  },
): boolean {
  if (tab === "dermatologico") return Boolean(data.derm);
  if (LIFESTYLE_REPORT_TABS.includes(tab)) return Boolean(data.lifestyle);
  return Boolean(data.skin && data.skin.distributionTotal > 0);
}

function dermRows(data: AnalisisDermaPiel360Report): Row[] {
  return [
    ["Categoría", "Diagnósticos", "%"],
    ...data.byCategory.map((c) => [c.label, c.count, c.pct.toFixed(1)]),
    [],
    ["#", "Diagnóstico", "CIE-10", "Cantidad", "%"],
    ...data.topDiagnoses.map((d, i) => [
      i + 1,
      d.diagnosis,
      d.icdCode ?? "",
      d.count,
      d.pct.toFixed(1),
    ]),
    [],
    ["Rango de edad", "Hombres", "Mujeres", "Sin género", "Total", "%"],
    ...data.byAgeGender.map((r, i) => [
      r.label,
      r.male,
      r.female,
      r.unknown,
      data.ageDistribution[i]?.count ?? r.male + r.female + r.unknown,
      data.ageDistribution[i]?.pct.toFixed(1) ?? "",
    ]),
    [],
    ["Tono de piel", "Análisis", "%"],
    ...data.bySkinTone.map((t) => [t.label, t.count, t.pct.toFixed(1)]),
  ];
}

function lifestyleSection(data: LifestyleReport, tab: ReportTab) {
  if (tab === "nacimiento") return data.birthType;
  if (tab === "mascotas") return data.pets;
  if (tab === "actividad") return data.activity;
  return data.clinicalAi;
}

function categoryRows(data: SkinHealthReport, sort: TopProblemsSort): Row[] {
  return [
    [
      "Categoría",
      "Puntaje promedio",
      "Pacientes",
      "Pacientes afectados",
      "% afectados",
      "% candidatos a protocolo",
      "Mediciones",
      "Evolución",
    ],
    ...sortCategories(data.categories, sort).map((c) => [
      c.label,
      c.avgScore != null ? c.avgScore.toFixed(1) : "",
      c.patients,
      c.patientsAffected,
      c.affectedPct.toFixed(1),
      c.candidatePct.toFixed(1),
      c.samples,
      c.trendDelta != null ? c.trendDelta.toFixed(1) : "",
    ]),
  ];
}

function summaryRows(data: SkinHealthReport): Row[] {
  const k = data.kpis;
  return [
    ["Indicador", "Periodo actual", "Periodo anterior"],
    [
      "Pacientes analizados",
      k.patientsAnalyzed.current,
      k.patientsAnalyzed.previous,
    ],
    ["Análisis realizados", k.analyses.current, k.analyses.previous],
    [
      "Puntaje promedio de piel",
      k.averageScore.current,
      k.averageScore.previous,
    ],
    [
      "Edad promedio de piel",
      k.averageSkinAge.current,
      k.averageSkinAge.previous,
    ],
    [
      "Diferencia edad de piel vs real",
      k.skinAgeDifference.current,
      k.skinAgeDifference.previous,
    ],
    [
      "% pacientes en estado crítico",
      k.criticalPatientsPct.current,
      k.criticalPatientsPct.previous,
    ],
    [
      "% candidatos a protocolo",
      k.protocolCandidatesPct.current,
      k.protocolCandidatesPct.previous,
    ],
    [],
    ["Banda", "Análisis", "%"],
    ...data.distribution.map((d) => [d.label, d.count, d.pct.toFixed(1)]),
    [],
    ["Mes", "Puntaje promedio", "Análisis"],
    ...data.scoreTrend.map((p) => [
      p.period,
      p.avgScore != null ? p.avgScore.toFixed(1) : "",
      p.analyses,
    ]),
  ];
}

/** Descarga el CSV de la pestaña activa (mismo contenido que tenía la página del doctor). */
export function exportReportCsv(
  tab: ReportTab,
  data: {
    skin?: SkinHealthReport;
    lifestyle?: LifestyleReport;
    derm?: AnalisisDermaPiel360Report;
  },
  sort: TopProblemsSort,
) {
  if (tab === "dermatologico") {
    if (data.derm)
      downloadCsv(
        `reporte-dermatologico-${data.derm.range.from}_${data.derm.range.to}`,
        dermRows(data.derm),
      );
    return;
  }
  if (LIFESTYLE_REPORT_TABS.includes(tab)) {
    const lifestyle = data.lifestyle;
    if (!lifestyle) return;
    const section = lifestyleSection(lifestyle, tab);
    downloadCsv(
      `reporte-${tab}-${lifestyle.range.from}_${lifestyle.range.to}`,
      [
        ["Segmento", "Pacientes", "%", "Puntaje promedio", "Análisis"],
        ...section.segments.map((s) => [
          s.label,
          s.patients,
          s.pct.toFixed(1),
          s.avgScore != null ? s.avgScore.toFixed(1) : "",
          s.analyses ?? "",
        ]),
      ],
    );
    return;
  }
  const skin = data.skin;
  if (!skin) return;
  if (tab === "top" || tab === "necesidades") {
    downloadCsv(
      `reporte-categorias-${skin.range.from}_${skin.range.to}`,
      categoryRows(skin, sort),
    );
    return;
  }
  downloadCsv(
    `reporte-resumen-${skin.range.from}_${skin.range.to}`,
    summaryRows(skin),
  );
}
