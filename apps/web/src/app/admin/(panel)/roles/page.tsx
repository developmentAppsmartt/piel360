"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { RolesList } from "@/components/admin/roles-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { useDeleteRole, useRoles } from "@/lib/queries/roles";
import type { Role } from "@/lib/queries/roles";

const PROTECTED_ROLE_NAMES = new Set([
  "superadmin",
  "doctor",
  "patient",
  "monitor",
  "empresa",
]);

function DeleteDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const remove = useDeleteRole();
  const isProtected = PROTECTED_ROLE_NAMES.has(role.name);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {role.label ?? role.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            {isProtected ? (
              "Este rol del sistema no se puede eliminar."
            ) : role._count.users > 0 ? (
              <>
                Este rol está asignado a <strong>{role._count.users}</strong> usuario
                {role._count.users === 1 ? "" : "s"}. Al eliminarlo solo se les quita el rol.
              </>
            ) : (
              "Se eliminará este rol del catálogo."
            )}{" "}
            {!isProtected ? "Esta acción no se puede deshacer." : null}
          </p>

          {remove.error ? (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError ? remove.error.message : "No se pudo eliminar el rol."}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending || isProtected}
              onClick={async () => {
                await remove.mutateAsync(role.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const roles = useRoles();
  const [deleting, setDeleting] = useState<Role | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/configuracion" className="hover:text-foreground">
              Configuración
            </Link>{" "}
            › <span className="text-foreground">Roles y permisos</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Roles y permisos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Administra los roles del sistema y define qué puede hacer cada perfil.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/roles/permisos-planes" />}
          >
            Permisos de planes
          </Button>
          <Button type="button" nativeButton={false} render={<Link href="/admin/roles/nuevo" />}>
            <Plus className="size-4" />
            Crear rol
          </Button>
        </div>
      </div>

      {roles.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {roles.error ? (
        <p className="text-sm text-destructive">No se pudo cargar la lista de roles.</p>
      ) : null}
      {roles.data ? <RolesList roles={roles.data} onDelete={setDeleting} /> : null}

      {deleting ? <DeleteDialog role={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}
