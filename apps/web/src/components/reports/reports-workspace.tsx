"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";
import type {
  AnalisisDermaPiel360Report,
  LifestyleReport,
  SkinHealthReport,
} from "@/lib/queries/doctor-reports";
import { cn } from "@/lib/utils";
import { LifestyleReportPanel } from "./lifestyle-report-panel";
import { NeedsMapView } from "./needs-map-view";
import { LIFESTYLE_REPORT_TABS, type ReportTab } from "./report-csv";
import { SkinHealthSummary } from "./skin-health-summary";
import { AnalisisDermaPiel360ReportView } from "./skiniver-report-view";
import { TopProblemsTable, type TopProblemsSort } from "./top-problems-table";

type TabItem = { key: string; label: string };

const SKIN_TABS: TabItem[] = [
  { key: "resumen", label: "Resumen de salud de la piel" },
  { key: "necesidades", label: "Mapa de necesidades" },
  { key: "top", label: "Top problemas" },
  { key: "dermatologico", label: "Análisis dermatológico" },
];

const LIFESTYLE_TABS: TabItem[] = [
  { key: "nacimiento", label: "Tipo de nacimiento" },
  { key: "mascotas", label: "Mascotas y salud de la piel" },
  { key: "actividad", label: "Actividad física y deporte" },
  { key: "clinico", label: "Análisis clínico IA" },
];

const LIFESTYLE_PANELS: Record<
  string,
  {
    pick: (d: LifestyleReport) => LifestyleReport["pets"];
    mode: "score" | "volume";
    description: string;
  }
> = {
  nacimiento: {
    pick: (d) => d.birthType,
    mode: "score",
    description:
      "Puntaje promedio de piel según tipo de nacimiento del paciente.",
  },
  mascotas: {
    pick: (d) => d.pets,
    mode: "score",
    description:
      "Relación entre mascotas en el hogar y el puntaje promedio de piel.",
  },
  actividad: {
    pick: (d) => d.activity,
    mode: "score",
    description: "Puntaje promedio de piel según hábito de actividad física.",
  },
  clinico: {
    pick: (d) => d.clinicalAi,
    mode: "volume",
    description:
      "Volumen de análisis por proveedor clínico (Dermatológico, Estético, Fototipo).",
  },
};

function TabRow({
  label,
  items,
  tab,
  onChange,
}: {
  label: string;
  items: TabItem[];
  tab: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={tab === item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === item.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function QueryState({ query }: { query: UseQueryResult<unknown> }) {
  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Cargando reportes…</p>;
  if (query.error)
    return (
      <p className="text-sm text-destructive">
        No se pudieron cargar los reportes.
      </p>
    );
  return null;
}

/**
 * Las pestañas de Reportes que comparten el panel del doctor y el del admin.
 * `leadingTabs` añade pestañas propias del panel (la «General» del admin),
 * cuyo contenido pinta la página; aquí solo se pintan las de salud de la piel
 * y estilo de vida.
 */
export function ReportsWorkspace({
  tab,
  onTabChange,
  sort,
  onSortChange,
  skin,
  lifestyle,
  derm,
  leadingTabs = [],
  showClinicalBrowser = true,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
  sort: TopProblemsSort;
  onSortChange: (sort: TopProblemsSort) => void;
  skin: UseQueryResult<SkinHealthReport>;
  lifestyle: UseQueryResult<LifestyleReport>;
  derm: UseQueryResult<AnalisisDermaPiel360Report>;
  leadingTabs?: TabItem[];
  /** El buscador clínico carga todos los análisis para filtrar en cliente: a escala de plataforma no es viable. */
  showClinicalBrowser?: boolean;
}) {
  const isDerm = tab === "dermatologico";
  const isLifestyle = LIFESTYLE_REPORT_TABS.includes(tab as ReportTab);
  const isSkin = tab === "resumen" || tab === "necesidades" || tab === "top";
  const isEmpty = skin.data && skin.data.distributionTotal === 0;
  const lifestylePanel = LIFESTYLE_PANELS[tab];

  return (
    <>
      <div className="space-y-2">
        <TabRow
          label="Vista del reporte de salud"
          items={[...leadingTabs, ...SKIN_TABS]}
          tab={tab}
          onChange={onTabChange}
        />
        <TabRow
          label="Vista del reporte lifestyle"
          items={LIFESTYLE_TABS}
          tab={tab}
          onChange={onTabChange}
        />
      </div>

      {isSkin ? <QueryState query={skin} /> : null}
      {isLifestyle ? <QueryState query={lifestyle} /> : null}
      {isDerm ? <QueryState query={derm} /> : null}

      {isDerm && derm.data ? (
        <AnalisisDermaPiel360ReportView
          report={derm.data}
          showClinicalBrowser={showClinicalBrowser}
        />
      ) : null}

      {isSkin && isEmpty ? (
        <ModuleCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BarChart3 className="size-6" />
          </span>
          <div>
            <p className="font-semibold">Aún no hay datos en este periodo</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Estos reportes se construyen con los análisis de piel con IA.
              Amplía el rango de fechas o realiza un análisis para empezar a ver
              resultados.
            </p>
          </div>
        </ModuleCard>
      ) : null}

      {isSkin && skin.data && !isEmpty ? (
        <>
          {tab === "resumen" && <SkinHealthSummary report={skin.data} />}
          {tab === "necesidades" && <NeedsMapView report={skin.data} />}
          {tab === "top" && (
            <ModuleCard className="p-5">
              <TopProblemsTable
                categories={skin.data.categories}
                sort={sort}
                onSortChange={onSortChange}
              />
            </ModuleCard>
          )}
        </>
      ) : null}

      {lifestylePanel && lifestyle.data ? (
        <LifestyleReportPanel
          section={lifestylePanel.pick(lifestyle.data)}
          mode={lifestylePanel.mode}
          description={lifestylePanel.description}
        />
      ) : null}
    </>
  );
}
