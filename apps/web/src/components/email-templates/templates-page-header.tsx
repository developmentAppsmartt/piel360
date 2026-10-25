import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Migas, título y las dos acciones de cabecera: activar la plantilla en
 * edición y crear una personalizada. */
export function TemplatesPageHeader({
  selectedName,
  isActive,
  onActiveChange,
  showCreate,
  onCreate,
  creating,
}: {
  /** `null` cuando no hay plantilla seleccionada: no sale el interruptor. */
  selectedName: string | null;
  isActive: boolean;
  onActiveChange: (activa: boolean) => void;
  showCreate: boolean;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Configuración <ChevronRight className="mx-1 inline size-3.5" />{" "}
        Plantillas de correo
        {selectedName ? (
          <>
            {" "}
            <ChevronRight className="mx-1 inline size-3.5" /> {selectedName}
          </>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plantillas de correo
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Crea plantillas desde cero, inserta banners e variables, y conserva
            la identidad visual de Piel360.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedName ? (
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
          ) : null}
          {showCreate ? (
            <Button type="button" size="sm" onClick={onCreate} disabled={creating}>
              <Plus className="size-3.5" />
              {creating ? "Creando…" : "Nueva plantilla"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
