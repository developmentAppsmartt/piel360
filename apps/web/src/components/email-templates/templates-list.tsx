"use client";

import { useMemo, useState } from "react";
import { Eye, LayoutGrid, Mail, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";
import { TEMPLATE_TYPES, type TemplateRow, type TemplateTypeId } from "@/lib/email-template-catalog";
import { cn } from "@/lib/utils";

type Filter = "all" | TemplateTypeId;

const ACTION_BUTTON =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

/** Listado de plantillas: pestañas por tipo, buscador y tabla. Solo pinta y
 * avisa; abrir, borrar y restaurar los resuelve el workspace. */
export function TemplatesList({
  rows,
  isLoading,
  busy,
  onView,
  onEdit,
  onRemove,
}: {
  rows: TemplateRow[];
  isLoading: boolean;
  busy: boolean;
  onView: (row: TemplateRow) => void;
  onEdit: (row: TemplateRow) => void;
  onRemove: (row: TemplateRow) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // Solo las pestañas con correos: al admin le sobran Citas o Pacientes.
  const types = useMemo(
    () => (Object.keys(TEMPLATE_TYPES) as TemplateTypeId[]).filter((t) => rows.some((r) => r.type === t)),
    [rows],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || r.type === filter) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, filter, query]);

  const tabs: { id: Filter; label: string; icon: typeof Mail }[] = [
    { id: "all", label: "Todas", icon: LayoutGrid },
    ...types.map((t) => ({ id: t, label: TEMPLATE_TYPES[t].label, icon: TEMPLATE_TYPES[t].icon })),
  ];

  return (
    <ModuleCard className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
              filter === id
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:bg-muted/60",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Buscar plantilla</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre de plantilla…"
          className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre de plantilla</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Descripción</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  No hay plantillas que coincidan.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <TemplateRowView
                  key={row.key}
                  row={row}
                  busy={busy}
                  onView={onView}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Mostrando {visible.length} de {rows.length} plantillas
      </p>
    </ModuleCard>
  );
}

function TemplateRowView({
  row,
  busy,
  onView,
  onEdit,
  onRemove,
}: {
  row: TemplateRow;
  busy: boolean;
  onView: (row: TemplateRow) => void;
  onEdit: (row: TemplateRow) => void;
  onRemove: (row: TemplateRow) => void;
}) {
  const type = TEMPLATE_TYPES[row.type];
  // Un evento sin personalizar no tiene nada que restaurar.
  const removeLabel = row.eventKind ? "Restaurar contenido por defecto" : "Eliminar plantilla";
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="flex items-center gap-2.5 text-left font-medium hover:text-primary"
        >
          <Mail className="size-4 shrink-0 text-primary" aria-hidden />
          {row.name}
        </button>
      </td>
      <td className="px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", type.chip)}>{type.label}</span>
      </td>
      <td className="max-w-xs px-4 py-3 text-muted-foreground">
        <p className="line-clamp-2">{row.description}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            row.isActive
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
              : "bg-muted text-muted-foreground",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", row.isActive ? "bg-emerald-600" : "bg-muted-foreground")}
            aria-hidden
          />
          {row.isActive ? "Activa" : "Inactiva"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <button type="button" className={ACTION_BUTTON} onClick={() => onView(row)} title="Vista previa">
            <Eye className="size-4" />
            <span className="sr-only">Vista previa de {row.name}</span>
          </button>
          <button type="button" className={ACTION_BUTTON} onClick={() => onEdit(row)} title="Editar">
            <Pencil className="size-4" />
            <span className="sr-only">Editar {row.name}</span>
          </button>
          {row.templateId ? (
            <button
              type="button"
              className={ACTION_BUTTON}
              onClick={() => onRemove(row)}
              disabled={busy}
              title={removeLabel}
            >
              {row.eventKind ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />}
              <span className="sr-only">
                {removeLabel}: {row.name}
              </span>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
