"use client";

import type { Permission } from "@/lib/queries/roles";

// Mismos 9 recursos × 6 acciones sembrados en apps/api/prisma/seed.ts —
// el nombre de cada permiso es `${accion}_${recurso}`. Fijos acá (no se
// derivan parseando el string) porque algunos recursos tienen guión bajo
// propio (gateway_config, encyclopedia_entry), lo que haría ambiguo un split.
const RESOURCES = [
  { key: "user", label: "Usuarios" },
  { key: "doctor", label: "Doctores" },
  { key: "patient", label: "Pacientes" },
  { key: "plan", label: "Planes" },
  { key: "subscription", label: "Suscripciones" },
  { key: "gateway_config", label: "Config. de pasarela" },
  { key: "role", label: "Roles" },
  { key: "analysis", label: "Análisis" },
  { key: "encyclopedia_entry", label: "Enciclopedia" },
] as const;

const ACTIONS = [
  { key: "view_any", label: "Ver todos" },
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "update", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "delete_any", label: "Eliminar todos" },
] as const;

export function PermissionMatrix({
  permissions,
  selected,
  onChange,
}: {
  permissions: Permission[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const byName = new Map(permissions.map((p) => [p.name, p]));
  const allIds = permissions.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(allIds));
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        Seleccionar todos
      </label>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2 text-left font-medium">Recurso</th>
              {ACTIONS.map((action) => (
                <th key={action.key} className="p-2 text-center font-medium whitespace-nowrap">
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((resource) => (
              <tr key={resource.key} className="border-b border-border last:border-0">
                <td className="p-2 whitespace-nowrap">{resource.label}</td>
                {ACTIONS.map((action) => {
                  const permission = byName.get(`${action.key}_${resource.key}`);
                  if (!permission) return <td key={action.key} className="p-2 text-center">—</td>;
                  return (
                    <td key={action.key} className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(permission.id)}
                        onChange={() => toggle(permission.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
