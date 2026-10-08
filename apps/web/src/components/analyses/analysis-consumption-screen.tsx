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
import { useOrganizationTeam } from "@/lib/queries/organizations";

/**
 * `showTeamFilter` solo lo activa el panel del profesional: las pantallas de
 * admin comparten esta vista y para ellas `GET /organizations/me` no aplica.
 */
export function AnalysisConsumptionScreen({
  subtitle,
  headerExtra,
  showTeamFilter = false,
}: {
  subtitle?: string;
  headerExtra?: React.ReactNode;
  showTeamFilter?: boolean;
}) {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<ConsumptionRangePreset>("month");
  const [dayDate, setDayDate] = useState(() => toLocalIsoDate(today));
  const [monthKey, setMonthKey] = useState(() => toLocalMonthKey(today));
  const [customFrom, setCustomFrom] = useState(
    () => rangeForPreset("month").from!,
  );
  const [customTo, setCustomTo] = useState(() => rangeForPreset("month").to!);

  const [professionalUserId, setProfessionalUserId] = useState("all");

  const team = useOrganizationTeam(showTeamFilter);
  const members = team.data?.members ?? [];
  // Solo el dueño filtra por profesional: al resto el API responde 403
  // (analyses.service.ts#getConsumption).
  const showProfessionalFilter =
    team.data?.memberRole === "owner" && members.length > 1;

  const params = useMemo(() => {
    const professional = showProfessionalFilter ? professionalUserId : "all";
    if (range === "day")
      return { from: dayDate, to: dayDate, professionalUserId: professional };
    if (range === "month")
      return { ...rangeForMonthKey(monthKey), professionalUserId: professional };
    return {
      from: customFrom,
      to: customTo,
      professionalUserId: professional,
    };
  }, [
    range,
    dayDate,
    monthKey,
    customFrom,
    customTo,
    professionalUserId,
    showProfessionalFilter,
  ]);

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
      subscriptionEndsAt={data.subscriptionEndsAt}
      subtitle={subtitle}
      headerExtra={headerExtra}
      members={members}
      showProfessionalFilter={showProfessionalFilter}
      professionalUserId={professionalUserId}
      onProfessionalChange={setProfessionalUserId}
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
