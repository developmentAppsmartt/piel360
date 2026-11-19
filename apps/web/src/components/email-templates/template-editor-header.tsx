import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EditorTab = "edit" | "preview" | "variables";

const TABS = [
  { id: "edit", label: "Editar plantilla" },
  { id: "preview", label: "Vista previa" },
  { id: "variables", label: "Variables disponibles" },
] as const;

/** Volver al listado, título de la plantilla que se edita, si está activa,
 * su botón de borrar o restaurar y las pestañas del editor. */
export function TemplateEditorHeader({
  name,
  isDefault,
  isEvent,
  canDelete,
  deleting,
  onDelete,
  isActive,
  onActiveChange,
  onBack,
  tab,
  onTab,
}: {
  name: string;
  isDefault: boolean;
  /** Correo de evento: borrar es volver al contenido por defecto. */
  isEvent: boolean;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  isActive: boolean;
  onActiveChange: (activa: boolean) => void;
  onBack: () => void;
  tab: EditorTab;
  onTab: (tab: EditorTab) => void;
}) {
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="size-3.5" />
        Volver a plantillas
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Editar «{name}»</h2>
          {isDefault ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Contenido por defecto — aún no personalizado
            </span>
          ) : null}
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              role="switch"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="size-4 accent-primary"
            />
            Plantilla activa
          </label>
          {canDelete ? (
            <Button type="button" variant="outline" size="sm" onClick={onDelete} disabled={deleting}>
              {isEvent ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}
              {isEvent ? "Volver al default" : "Eliminar"}
            </Button>
          ) : null}
        </div>
        <div className="flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
