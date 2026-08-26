import { CreateModeratorForm } from "@/components/admin/create-moderator-form";

export default function NuevoModeradorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crear moderador</h1>
        <p className="text-sm text-muted-foreground">
          El moderador podrá iniciar sesión en este panel y validar doctores.
        </p>
      </div>
      <CreateModeratorForm />
    </div>
  );
}
