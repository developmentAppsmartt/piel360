"use client";

import type { TeamMemberPermission } from "@piel360/shared";
import { TEAM_PERMISSION_GROUPS } from "@/lib/team-reference-permissions";

/** Módulos del panel que se le activan a un miembro del equipo. */
export function TeamPermissionModules({
  modules,
  allSelected,
  onToggle,
  onToggleAll,
}: {
  modules: Set<TeamMemberPermission>;
  allSelected: boolean;
  onToggle: (key: TeamMemberPermission) => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Activa o desactiva módulos. Puedes dejarlos todos vacíos. Solo afectan
        a este usuario.
      </p>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-sm text-indigo-900">
        <p className="font-medium">Análisis IA</p>
        <p className="mt-0.5 text-xs text-indigo-800/80">
          Dermatológico, Estético y Fototipo se asignan según la especialidad o
          el técnico laboral elegido (configuración del administrador en
          Permisos de planes). No se configuran aquí.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEAM_PERMISSION_GROUPS.map((group) => {
          const checked = modules.has(group.key);
          return (
            <label
              key={group.key}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors ${
                checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background hover:border-primary/30"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={checked}
                onChange={() => onToggle(group.key)}
              />
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <group.icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {group.label}
                  </span>
                </span>
                {group.description ? (
                  <span className="block text-xs text-muted-foreground">
                    {group.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={allSelected}
          onChange={onToggleAll}
        />
        Seleccionar todos
      </label>
    </div>
  );
}
