import Link from "next/link";
import { Activity, Shield, UserPlus } from "lucide-react";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import type { AnalysisListItem } from "@/lib/queries/analyses";
import type { Patient } from "@/lib/queries/patients";
import { cn } from "@/lib/utils";

export type ActivityFeedItem = {
  id: string;
  title: string;
  patientName: string;
  time: string;
  sortAt: number;
  kind: "analysis_done" | "analysis_confirmed" | "patient_new";
};

const ICON_STYLES: Record<
  ActivityFeedItem["kind"],
  { bg: string; icon: typeof Activity }
> = {
  analysis_done: { bg: "bg-sky-100 text-sky-700", icon: Activity },
  analysis_confirmed: { bg: "bg-emerald-100 text-emerald-700", icon: Shield },
  patient_new: { bg: "bg-amber-100 text-amber-700", icon: UserPlus },
};

function buildActivity(
  analyses: AnalysisListItem[],
  patients: Patient[],
): ActivityFeedItem[] {
  const fromAnalyses: ActivityFeedItem[] = analyses.map((a) => {
    const patientName = `${a.patient.firstName} ${a.patient.lastName}`.trim();
    const provider = analysisProviderLabel(a);
    let title: string;
    let kind: ActivityFeedItem["kind"];
    if (a.isConfirmed) {
      title = `Análisis ${provider} confirmado`;
      kind = "analysis_confirmed";
    } else if (a.isValid) {
      title = `Nuevo análisis ${provider} completado`;
      kind = "analysis_done";
    } else {
      title = "Análisis registrado";
      kind = "analysis_done";
    }
    return {
      id: `a-${a.id}`,
      title,
      patientName,
      time: formatRelativeTime(a.createdAt),
      sortAt: new Date(a.createdAt).getTime(),
      kind,
    };
  });

  const fromPatients: ActivityFeedItem[] = patients.map((p) => ({
    id: `p-${p.id}`,
    title: "Nuevo paciente registrado",
    patientName: `${p.firstName} ${p.lastName}`.trim(),
    time: formatRelativeTime(p.createdAt),
    sortAt: new Date(p.createdAt).getTime(),
    kind: "patient_new" as const,
  }));

  return [...fromAnalyses, ...fromPatients]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 6);
}

export function DashboardRecentActivity({
  analyses = [],
  patients = [],
}: {
  analyses?: AnalysisListItem[];
  patients?: Patient[];
}) {
  const items = buildActivity(analyses, patients);
  if (items.length === 0) return null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-900">
          Actividad reciente
        </h3>
        <Link
          href="/doctor/analisis"
          className="text-sm font-medium text-[#2B59C3] hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <ul className="mt-3 divide-y divide-zinc-100">
        {items.map((item) => {
          const style = ICON_STYLES[item.kind];
          const Icon = style.icon;
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 py-3 first:pt-2 last:pb-0"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  style.bg,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  Paciente: {item.patientName}
                </p>
              </div>
              <span className="shrink-0 pt-0.5 text-xs text-zinc-400">
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
