import { planModuleLabelsFromPermissionNames } from "@/lib/permission-catalog";
import { planRoleLabel } from "@/lib/plan-roles";

export type PlanTeamFeatures = {
  maxUsers?: number;
  modules?: string[];
  roleLimits?: Record<string, number>;
};

export function planSpecialtySlots(roleLimits?: Record<string, number>) {
  if (!roleLimits) return [];
  return Object.entries(roleLimits)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([key, count]) => ({
      key,
      label: planRoleLabel(key),
      count,
    }));
}

export function planModuleLabels(modules: string[] = []) {
  return planModuleLabelsFromPermissionNames(modules);
}

export function PlanTeamFeaturesBlock({
  plan,
  compact = false,
}: {
  plan: PlanTeamFeatures;
  compact?: boolean;
}) {
  const maxUsers = plan.maxUsers ?? 1;
  const specialties = planSpecialtySlots(plan.roleLimits);
  const modules = planModuleLabels(plan.modules ?? []);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          Hasta {maxUsers} usuario{maxUsers === 1 ? "" : "s"} en el equipo
        </span>
      </div>

      {specialties.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Especialidades incluidas</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {specialties.map((slot) => (
              <span
                key={slot.key}
                className="inline-flex rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {slot.label}
                <span className="ml-1 text-muted-foreground">×{slot.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sin cupos por especialidad definidos en el plan.
        </p>
      )}

      {!compact && modules.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Módulos de la plataforma</p>
          <p className="mt-1 text-xs text-foreground">{modules.join(" · ")}</p>
        </div>
      ) : null}
    </div>
  );
}
