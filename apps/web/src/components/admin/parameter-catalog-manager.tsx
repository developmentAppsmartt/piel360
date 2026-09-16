"use client";

import { useMemo, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminParameterTypes,
  useAdminParameters,
  useCreateParameter,
  useUpdateParameter,
  useDeleteParameter,
  type Parameter,
} from "@/lib/queries/parameters";
import { cn } from "@/lib/utils";

const MAX_ROWS = 200;

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring";

function ParameterFormDialog({
  open,
  onOpenChange,
  typeSlug,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeSlug: string;
  /** null = crear. */
  editing: Parameter | null;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [sortOrder, setSortOrder] = useState(editing?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateParameter(typeSlug);
  const updateMutation = useUpdateParameter(typeSlug, editing?.id ?? "");
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSave() {
    setError(null);
    if (!label.trim()) {
      setError("El texto no puede estar vacío.");
      return;
    }
    try {
      const input = {
        label: label.trim(),
        code: code.trim() || undefined,
        sortOrder,
        isActive,
      };
      if (editing) {
        await updateMutation.mutateAsync(input);
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setLabel(editing?.label ?? "");
          setCode(editing?.code ?? "");
          setSortOrder(editing?.sortOrder ?? 0);
          setIsActive(editing?.isActive ?? true);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar parámetro" : "Nuevo parámetro"}</DialogTitle>
          <DialogDescription>
            Texto que verán los usuarios al elegir esta opción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Texto
            </label>
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Código (opcional)
              </label>
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Orden
              </label>
              <input
                type="number"
                className={inputClass}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Activo (visible en los formularios)
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button onClick={() => void handleSave()} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Gestor genérico de catálogos de parámetros (Entidad educativa, Institución
 * de educación técnica, Código CIIU, y cualquier otro que se agregue después
 * sin tocar código — un tipo por fila de ParameterType).
 */
export function ParameterCatalogManager() {
  const { data: types } = useAdminParameterTypes();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<
    { open: false } | { open: true; editing: Parameter | null }
  >({ open: false });

  const activeSlug = selectedSlug ?? types?.[0]?.slug ?? null;
  const { data: parameters, isLoading } = useAdminParameters(activeSlug ?? "");
  const deleteMutation = useDeleteParameter(activeSlug ?? "");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = parameters ?? [];
    const matches = q
      ? rows.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            (r.code ?? "").toLowerCase().includes(q),
        )
      : rows;
    return matches.slice(0, MAX_ROWS);
  }, [parameters, search]);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
          <Layers className="size-5 text-sidebar-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Catálogos de parámetros</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Listas usadas en los selects de los formularios de registro
            (entidad educativa, institución técnica, código CIIU).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 w-fit">
        {(types ?? []).map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setSelectedSlug(t.slug)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeSlug === t.slug
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      {activeSlug ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => setDialogState({ open: true, editing: null })}
            >
              <Plus className="mr-1 size-4" />
              Agregar
            </Button>
          </div>

          <div className="rounded-xl border border-border">
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Cargando…</p>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Sin resultados.
                </p>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.label}</p>
                      {p.code ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.code}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!p.isActive ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          Inactivo
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDialogState({ open: true, editing: p })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar «${p.label}»?`)) {
                            void deleteMutation.mutateAsync(p.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {parameters && parameters.length > MAX_ROWS && !search ? (
            <p className="text-xs text-muted-foreground">
              Mostrando los primeros {MAX_ROWS} de {parameters.length} — usa el
              buscador para encontrar otros.
            </p>
          ) : null}
        </>
      ) : null}

      {activeSlug && dialogState.open ? (
        <ParameterFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState(open ? dialogState : { open: false })}
          typeSlug={activeSlug}
          editing={dialogState.editing}
        />
      ) : null}
    </div>
  );
}
