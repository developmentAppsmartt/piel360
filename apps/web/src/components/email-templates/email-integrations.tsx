import { CloudOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

function TarjetaIntegracion({
  Icon,
  titulo,
  mensaje,
  accion,
}: {
  Icon: typeof Mail;
  titulo: string;
  mensaje: string;
  accion: string;
}) {
  return (
    <ModuleCard className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <ModuleCardTitle className="text-base">{titulo}</ModuleCardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{mensaje}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" disabled>
            {accion}
          </Button>
        </div>
      </div>
    </ModuleCard>
  );
}

/** Espacios reservados para conectar Google y el proveedor de correo. */
export function EmailIntegrations({
  googleMessage,
  providerMessage,
}: {
  googleMessage?: string;
  providerMessage?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TarjetaIntegracion
        Icon={CloudOff}
        titulo="Google Workspace / Gmail"
        mensaje={
          googleMessage ??
          "Conexión pendiente. Espacio reservado para OAuth de Google."
        }
        accion="Conectar Google (próximamente)"
      />
      <TarjetaIntegracion
        Icon={Mail}
        titulo="Proveedor de correo"
        mensaje={
          providerMessage ??
          "Espacio reservado para Resend / SMTP u otro proveedor."
        }
        accion="Configurar proveedor (próximamente)"
      />
    </div>
  );
}
