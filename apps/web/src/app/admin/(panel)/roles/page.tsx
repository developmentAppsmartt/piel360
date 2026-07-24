"use client";

import { useState } from "react";
import { RoleForm } from "@/components/admin/role-form";
import { RolesTable } from "@/components/admin/roles-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
  type Role,
} from "@/lib/queries/roles";

function EditDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const update = useUpdateRole(role.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar {role.name}</DialogTitle>
        </DialogHeader>
        <RoleForm
          defaultValues={role}
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

function DeleteDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const remove = useDeleteRole();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {role.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            {role._count.users > 0 ? (
              <>
                Este rol está asignado a <strong>{role._count.users}</strong> usuario
                {role._count.users === 1 ? "" : "s"}. Al eliminarlo solo se les quita el rol — no se
                borra ningún usuario.
              </>
            ) : (
              "Este rol no está asignado a ningún usuario."
            )}{" "}
            Esta acción no se puede deshacer.
          </p>

          {remove.error && (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError ? remove.error.message : "No se pudo eliminar el rol."}
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
                await remove.mutateAsync(role.id);
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

export default function RolesPage() {
  const roles = useRoles();
  const createRole = useCreateRole();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles y permisos</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          Nuevo rol
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Estos permisos controlan el acceso real a cada sección del panel. Un usuario sin el rol admin
        puede entrar igual si tiene al menos un permiso asignado por un rol personalizado, y solo podrá
        usar las acciones para las que tenga permiso.
      </p>

      {roles.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {roles.error && <p className="text-destructive">No se pudo cargar la lista de roles.</p>}
      {roles.data && <RolesTable roles={roles.data} onEdit={setEditing} onDelete={setDeleting} />}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
          </DialogHeader>
          <RoleForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await createRole.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing && <EditDialog role={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog role={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
