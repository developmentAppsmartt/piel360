"use client";

import { useState } from "react";
import { PlanForm } from "@/components/admin/plan-form";
import { PlansTable } from "@/components/admin/plans-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useAdminPlans,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
  type PlanAdmin,
} from "@/lib/queries/plans";

function EditDialog({ plan, onClose }: { plan: PlanAdmin; onClose: () => void }) {
  const update = useUpdatePlan(plan.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {plan.name}</DialogTitle>
        </DialogHeader>
        <PlanForm
          defaultValues={plan}
          submitLabel="Guardar cambios"
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ plan, onClose }: { plan: PlanAdmin; onClose: () => void }) {
  const remove = useDeletePlan();
  const count = plan._count.subscriptions;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {plan.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            {count > 0 ? (
              <>
                Este plan tiene <strong>{count}</strong> suscripción{count === 1 ? "" : "es"} asociada
                {count === 1 ? "" : "s"} (activas, pendientes o vencidas). Eliminarlo{" "}
                <strong>borrará también esas suscripciones y su historial de uso</strong> — esta acción no
                se puede deshacer.
              </>
            ) : (
              "Este plan no tiene suscripciones asociadas. Esta acción no se puede deshacer."
            )}
          </p>

          {remove.error && (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError ? remove.error.message : "No se pudo eliminar el plan."}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync(plan.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar definitivamente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanesPage() {
  const plans = useAdminPlans();
  const createPlan = useCreatePlan();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlanAdmin | null>(null);
  const [deleting, setDeleting] = useState<PlanAdmin | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planes</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          Nuevo plan
        </Button>
      </div>

      {plans.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {plans.error && <p className="text-destructive">No se pudo cargar la lista de planes.</p>}
      {plans.data && (
        <PlansTable plans={plans.data} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo plan</DialogTitle>
          </DialogHeader>
          <PlanForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await createPlan.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing && <EditDialog plan={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog plan={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
