"use client";

import {
  ANALISIS_PIEL360_SCORE_CONFIG_METRICS,
  ANALISIS_PIEL360_SCORE_SUBCATEGORIES,
  scoreConfigKey,
  type AnalisisPiel360ScoreConfig,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import { analisisPiel360RegionLabel } from "@/lib/youcam-metric-labels";
import { CARD_CLASS, isCustomized, metricLabel } from "./score-config-labels";

function NavItem({
  label,
  active,
  customized,
  nested = false,
  onClick,
}: {
  label: string;
  active: boolean;
  customized: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg py-2 pr-3 text-left text-sm transition",
        nested ? "pl-7 text-[13px]" : "pl-3",
        active ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted/60",
      )}
    >
      <span className="truncate">{label}</span>
      {customized ? (
        <span className="size-2 shrink-0 rounded-full bg-primary" title="Personalizada" />
      ) : null}
    </button>
  );
}

/** Métricas del análisis estético; Arrugas y Poros con sus subcategorías debajo. */
export function ScoreMetricNav({
  config,
  selected,
  onSelect,
}: {
  config: AnalisisPiel360ScoreConfig;
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className={cn(CARD_CLASS, "h-fit p-2")} aria-label="Métricas">
      <p className="px-3 pt-2 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Análisis estéticos
      </p>
      <ul className="space-y-0.5">
        {ANALISIS_PIEL360_SCORE_CONFIG_METRICS.map((type) => (
          <li key={type}>
            <NavItem
              label={metricLabel(type)}
              active={type === selected}
              customized={isCustomized(config.metrics[type])}
              onClick={() => onSelect(type)}
            />
            {ANALISIS_PIEL360_SCORE_SUBCATEGORIES[type] ? (
              <ul className="space-y-0.5" aria-label={`Subcategorías de ${metricLabel(type)}`}>
                {ANALISIS_PIEL360_SCORE_SUBCATEGORIES[type].map((region) => {
                  const key = scoreConfigKey(type, region);
                  return (
                    <li key={key}>
                      <NavItem
                        nested
                        label={analisisPiel360RegionLabel(region)}
                        active={key === selected}
                        customized={isCustomized(config.metrics[key])}
                        onClick={() => onSelect(key)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
