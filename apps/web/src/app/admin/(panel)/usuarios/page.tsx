"use client";

import { UsersTable } from "@/components/admin/users-table";
import { useUsers } from "@/lib/queries/users";

export default function UsuariosPage() {
  const users = useUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      {users.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {users.error && <p className="text-destructive">No se pudo cargar la lista de usuarios.</p>}
      {users.data && <UsersTable users={users.data} />}
    </div>
  );
}
