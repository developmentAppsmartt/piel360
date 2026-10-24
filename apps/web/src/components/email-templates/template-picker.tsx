import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/lib/queries/email-templates";

const claseTarjeta = (activa: boolean) =>
  cn(
    "min-w-40 flex-1 rounded-xl border px-4 py-3 text-left transition-colors sm:flex-none",
    activa
      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
      : "border-border bg-background hover:bg-muted/60",
  );

/** Qué plantilla se está editando: un evento que envía correo solo, o una
 * plantilla personalizada. Solo elige; el estado vive en el workspace. */
export function TemplatePicker({
  eventKinds,
  kindLabel,
  mode,
  activeKind,
  onPickKind,
  onShowCustom,
  customTemplates,
  isLoading,
  selectedId,
  onPickCustom,
  onCreate,
  creating,
}: {
  eventKinds: readonly string[];
  kindLabel: (kindId: string) => string;
  mode: "event" | "custom";
  activeKind: string;
  onPickKind: (kindId: string) => void;
  onShowCustom: () => void;
  customTemplates: EmailTemplate[];
  isLoading: boolean;
  selectedId: string | null;
  onPickCustom: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eventos que envían correo automáticamente
        </p>
        <div className="flex flex-wrap gap-2">
          {eventKinds.map((kindId) => (
            <button
              key={kindId}
              type="button"
              onClick={() => onPickKind(kindId)}
              className={claseTarjeta(mode === "event" && activeKind === kindId)}
            >
              <p className="text-sm font-medium">{kindLabel(kindId)}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onShowCustom}
          className={cn(
            "text-xs underline-offset-2 hover:underline",
            mode === "custom" ? "font-semibold text-foreground" : "text-primary",
          )}
        >
          Ver plantillas personalizadas
        </button>
      </div>

      {mode === "custom" ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Plantillas personalizadas
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !customTemplates.length ? (
            <ModuleCard className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">Aún no hay plantillas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea la primera para diseñar asunto, preencabezado, banner y
                  contenido.
                </p>
              </div>
              <Button type="button" onClick={onCreate} disabled={creating}>
                <Plus className="size-3.5" />
                Crear plantilla
              </Button>
            </ModuleCard>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onPickCustom(tpl.id)}
                  className={claseTarjeta(tpl.id === selectedId)}
                >
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tpl.subject}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
