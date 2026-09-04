"use client";

import { useMemo, useState } from "react";
import {
  AnalysisConsumptionView,
  type ConsumptionRangePreset,
} from "@/components/analyses/analysis-consumption-view";
import {
  rangeForMonthKey,
  rangeForPreset,
  toLocalIsoDate,
  toLocalMonthKey,
  useAnalysisConsumption,
} from "@/lib/queries/analysis-consumption";

export function AnalysisConsumptionScreen({
  subtitle,
  headerExtra,
}: {
  subtitle?: string;
  headerExtra?: React.ReactNode;
}) {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<ConsumptionRangePreset>("month");
  const [dayDate, setDayDate] = useState(() => toLocalIsoDate(today));
  const [monthKey, setMonthKey] = useState(() => toLocalMonthKey(today));
  const [customFrom, setCustomFrom] = useState(
    () => rangeForPreset("month").from!,
  );
  const [customTo, setCustomTo] = useState(() => rangeForPreset("month").to!);

  const params = useMemo(() => {
    if (range === "day") return { from: dayDate, to: dayDate };
    if (range === "month") return rangeForMonthKey(monthKey);
    return { from: customFrom, to: customTo };
  }, [range, dayDate, monthKey, customFrom, customTo]);

  const query = useAnalysisConsumption(params);

  if (query.isLoading && !query.data) {
    return <p className="text-muted-foreground">Cargando consumo...</p>;
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-destructive">
        No se pudo cargar el consumo de análisis. Intenta de nuevo.
      </p>
    );
  }

  const data = query.data;

  return (
    <AnalysisConsumptionView
      aesthetic={data.aesthetic}
      derm={data.derm}
      daily={data.daily}
      rows={data.rows}
      subtitle={subtitle}
      headerExtra={headerExtra}
      range={range}
      onRangeChange={(next) => {
        setRange(next);
        if (next === "custom") {
          const current =
            range === "day"
              ? { from: dayDate, to: dayDate }
              : range === "month"
                ? rangeForMonthKey(monthKey)
                : { from: customFrom, to: customTo };
          setCustomFrom(current.from!);
          setCustomTo(current.to!);
        }
      }}
      dayDate={dayDate}
      onDayDateChange={(iso) => {
        setDayDate(iso);
        setRange("day");
      }}
      monthKey={monthKey}
      onMonthKeyChange={(key) => {
        setMonthKey(key);
        setRange("month");
      }}
      dateFrom={customFrom}
      dateTo={customTo}
      onCustomDatesChange={(from, to) => {
        setCustomFrom(from);
        setCustomTo(to);
        setRange("custom");
      }}
      isRefreshing={query.isFetching && !query.isLoading}
    />
  );
}
