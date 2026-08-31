"use client";

import Link from "next/link";
import { use } from "react";
import { RoleEditorForm } from "@/components/admin/role-editor-form";
import { Button } from "@/components/ui/button";
import { useRole, useRoles, useUpdateRole } from "@/lib/queries/roles";

export default function EditarRolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listQuery = useRoles();
  const cachedRole = listQuery.data?.find((role) => role.id === id);
  const detailQuery = useRole(id, { enabled: listQuery.isSuccess && !cachedRole });
  const updateRole = useUpdateRole(id);

  const role = cachedRole ?? detailQuery.data;
  const isLoading = listQuery.isLoading || (!cachedRole && detailQuery.isLoading);
  const hasError =
    listQuery.isError || (!cachedRole && detailQuery.isError && !detailQuery.data);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando rol…</p>;
  }

  if (hasError || !role) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">No se pudo cargar el rol.</p>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/roles" />}>
          Volver a roles
        </Button>
      </div>
    );
  }

  return (
    <RoleEditorForm
      mode="edit"
      defaultValues={role}
      onSubmit={async (input) => {
        await updateRole.mutateAsync(input);
      }}
    />
  );
}
