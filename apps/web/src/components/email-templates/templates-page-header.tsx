import { ChevronRight, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBanner } from "@/components/ui/page-banner";

/** Migas y banner de Plantillas de correo, con «Nueva plantilla». */
export function TemplatesPageHeader({
  audience,
  onCreate,
  creating,
}: {
  /** A quién le llegan los correos de este panel. */
  audience: "pacientes" | "profesionales";
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Configuración <ChevronRight className="mx-1 inline size-3.5" /> Plantillas de correo
      </p>
      <PageBanner
        icon={Mail}
        image
        title="Plantillas de correo"
        subtitle={`Crea y administra tus plantillas de correo para enviar comunicaciones a ${
          audience === "pacientes" ? "tus pacientes" : "los profesionales"
        }.`}
        actions={
          <Button type="button" onClick={onCreate} disabled={creating} className="gap-1.5 rounded-full px-4">
            <Plus className="size-4" />
            {creating ? "Creando…" : "Nueva plantilla"}
          </Button>
        }
      />
    </div>
  );
}
