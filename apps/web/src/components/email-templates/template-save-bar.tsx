import { Button } from "@/components/ui/button";

/** Mensaje de estado + Cancelar / Guardar al pie del editor. */
export function TemplateSaveBar({
  message,
  dirty,
  saving,
  onCancel,
  onSave,
}: {
  message: string | null;
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
      {message ? (
        <p className="mr-auto text-sm text-muted-foreground">{message}</p>
      ) : dirty ? (
        <p className="mr-auto text-sm text-amber-700">Hay cambios sin guardar.</p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={!dirty || saving}
      >
        Cancelar
      </Button>
      <Button type="button" onClick={onSave} disabled={!dirty || saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
