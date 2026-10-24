"use client";

import { useState } from "react";
import { PatientsProfessionalFilter } from "@/components/patients/patients-table";
import {
  canExportReport,
  exportReportCsv,
  type ReportTab,
} from "@/components/reports/report-csv";
import {
  ReportFilters,
  rangeForDays,
} from "@/components/reports/report-filters";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import type { TopProblemsSort } from "@/components/reports/top-problems-table";
import {
  useAnalisisDermaPiel360Report,
  useLifestyleReport,
  useSkinHealthReport,
  type DoctorReportsFilters,
} from "@/lib/queries/doctor-reports";
import { useOrganizationTeam } from "@/lib/queries/organizations";

export default function ReportesPage() {
  const [filters, setFilters] = useState<DoctorReportsFilters>({
    ...rangeForDays(180),
    trendMonths: 6,
  });
  const [tab, setTab] = useState<ReportTab>("resumen");
  const [sort, setSort] = useState<TopProblemsSort>("score");

  const skin = useSkinHealthReport(filters);
  const lifestyle = useLifestyleReport(filters);
  const derm = useAnalisisDermaPiel360Report(filters, tab === "dermatologico");
  const team = useOrganizationTeam();
  const members = team.data?.members ?? [];
  // Solo el dueño filtra por profesional: el backend devuelve 403 a los demás
  // (doctor-reports.service.ts#resolveDoctorIds) y el desplegable además les
  // enseñaba los nombres del resto del equipo. Mismo criterio que Pacientes.
  const showProfessionalFilter =
    team.data?.memberRole === "owner" && members.length > 1;
  const data = { skin: skin.data, lifestyle: lifestyle.data, derm: derm.data };

  return (
    <div className="space-y-5">
      <div>
        <h1>Reportes</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Analítica de salud de la piel de tus pacientes a partir de los
          análisis de piel con IA.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        scopeFilter={
          showProfessionalFilter ? (
            <PatientsProfessionalFilter
              members={members}
              value={filters.professionalUserId ?? "all"}
              onChange={(professionalUserId) =>
                setFilters({ ...filters, professionalUserId })
              }
            />
          ) : null
        }
        onExport={() => exportReportCsv(tab, data, sort)}
        exportDisabled={!canExportReport(tab, data)}
      />

      <ReportsWorkspace
        tab={tab}
        onTabChange={(next) => setTab(next as ReportTab)}
        sort={sort}
        onSortChange={setSort}
        skin={skin}
        lifestyle={lifestyle}
        derm={derm}
      />
    </div>
  );
}
