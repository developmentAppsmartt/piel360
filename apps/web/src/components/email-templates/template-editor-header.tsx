import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EditorTab = "edit" | "preview" | "variables";

const TABS = [
  { id: "edit", label: "Editar plantilla" },
  { id: "preview", label: "Vista previa" },
  { id: "variables", label: "Variables disponibles" },
] as const;

/** Título de la plantilla que se edita, su botón de borrar y las pestañas
 * del editor. */
export function TemplateEditorHeader({
  name,
  isDefault,
  canDelete,
  deleteLabel,
  deleting,
  onDelete,
  tab,
  onTab,
}: {
  name: string;
  isDefault: boolean;
  canDelete: boolean;
  deleteLabel: string;
  deleting: boolean;
  onDelete: () => void;
  tab: EditorTab;
  onTab: (tab: EditorTab) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Editar «{name}»</h2>
        {isDefault ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Contenido por defecto — aún no personalizado
          </span>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="size-3.5" />
            {deleteLabel}
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
              tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
