import Link from "next/link";
import { CreateModeratorForm } from "@/components/admin/create-moderator-form";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

export default function NuevoModeradorPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/moderadores" className="hover:text-foreground">
            Moderadores
          </Link>{" "}
          › <span className="text-foreground">Crear moderador</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Crear moderador
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El moderador podrá iniciar sesión en este panel y validar doctores y empresas.
        </p>
      </div>

      <ModuleCard className="max-w-2xl">
        <ModuleCardTitle>Datos del moderador</ModuleCardTitle>
        <div className="mt-4">
          <CreateModeratorForm />
        </div>
      </ModuleCard>
    </div>
  );
}
