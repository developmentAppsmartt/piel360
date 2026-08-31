"use client";

import { RoleEditorForm } from "@/components/admin/role-editor-form";
import { useCreateRole } from "@/lib/queries/roles";

export default function NuevoRolPage() {
  const createRole = useCreateRole();

  return (
    <RoleEditorForm
      mode="create"
      onSubmit={async (input) => {
        await createRole.mutateAsync(input);
      }}
    />
  );
}
