"use client";

import { useState } from "react";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { SubscriptionsTable } from "@/components/admin/subscriptions-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useAdminSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
  type SubscriptionAdmin,
} from "@/lib/queries/subscriptions";

function EditDialog({
  subscription,
  onClose,
}: {
  subscription: SubscriptionAdmin;
  onClose: () => void;
}) {
  const update = useUpdateSubscription(subscription.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar suscripción de {subscription.user.name}</DialogTitle>
        </DialogHeader>
        <SubscriptionForm
          defaultValues={subscription}
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

function DeleteDialog({
  subscription,
  onClose,
}: {
  subscription: SubscriptionAdmin;
  onClose: () => void;
}) {
  const remove = useDeleteSubscription();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar suscripción</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            Esto elimina la suscripción de <strong>{subscription.user.name}</strong> al plan{" "}
            <strong>{subscription.plan.name}</strong>, junto con su historial de consumo de créditos.
            Esta acción no se puede deshacer.
          </p>

          {remove.error && (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError
                ? remove.error.message
                : "No se pudo eliminar la suscripción."}
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
                await remove.mutateAsync(subscription.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SuscripcionesPage() {
  const subscriptions = useAdminSubscriptions();
  const createSubscription = useCreateSubscription();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAdmin | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionAdmin | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suscripciones</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          Nueva suscripción
        </Button>
      </div>

      {subscriptions.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {subscriptions.error && (
        <p className="text-destructive">No se pudo cargar la lista de suscripciones.</p>
      )}
      {subscriptions.data && (
        <SubscriptionsTable
          subscriptions={subscriptions.data}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva suscripción</DialogTitle>
          </DialogHeader>
          <SubscriptionForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await createSubscription.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing && <EditDialog subscription={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog subscription={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
