"use client";

import {
  Circle,
  CircleDot,
  Droplets,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { LayeredAnalysisImage } from "@/components/patients/layered-analysis-image";

const METRIC_ICONS: Partial<Record<string, LucideIcon>> = {
  hd_moisture: Droplets,
  hd_oiliness: Sparkles,
  hd_acne: CircleDot,
  hd_pore: Circle,
  hd_wrinkle: Waves,
  hd_texture: Waves,
  hd_radiance: Sparkles,
  hd_redness: CircleDot,
};

export function MetricIcon({ metricType }: { metricType: string }) {
  const Icon = METRIC_ICONS[metricType] ?? Circle;
  return <Icon className="size-4 text-primary" aria-hidden />;
}

export function ScoreMini({ score, caption }: { score: number; caption?: string }) {
  const tone =
    score >= 70 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <UnitRing
        percent={score}
        display="fraction"
        className="size-16"
        progressClassName={tone}
      />
      {caption ? (
        <p className="text-[10px] text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}

export function SkinThumb({
  label,
  photoUrl,
  maskUrl,
  onClick,
}: {
  label: string;
  photoUrl?: string | null;
  maskUrl?: string | null;
  onClick?: () => void;
}) {
  if (!photoUrl && !maskUrl) {
    return (
      <div
        aria-hidden
        title={label}
        className="size-14 rounded-lg border border-dashed border-border bg-muted/40"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ampliar`}
      className="size-14 shrink-0 overflow-hidden rounded-lg border border-border transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <LayeredAnalysisImage
        photoUrl={photoUrl}
        maskUrl={maskUrl}
        alt={label}
        className="size-full"
      />
    </button>
  );
}

export function ComparisonImage({
  label,
  photoUrl,
  date,
  onClick,
}: {
  label: string;
  photoUrl?: string | null;
  date?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!photoUrl || !onClick}
        className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted/30 transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:ring-0"
      >
        <LayeredAnalysisImage
          photoUrl={photoUrl}
          alt={label}
          fit="contain"
          className="size-full min-h-48"
        />
      </button>
      <div className="text-center">
        <p className="text-xs font-semibold">{label}</p>
        {date ? (
          <p className="text-[10px] text-muted-foreground">{date}</p>
        ) : null}
      </div>
    </div>
  );
}
