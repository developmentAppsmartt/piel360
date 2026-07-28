"use client";

import { useState } from "react";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { usePermissions } from "@/lib/queries/roles";
import type { Role, RoleInput } from "@/lib/queries/roles";

export function RoleForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Role;
  onSubmit: (input: RoleInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const permissions = usePermissions();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultValues?.permissions.map((p) => p.id) ?? []),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, permissionIds: Array.from(selected) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el rol.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField label="Nombre del rol" id="name" value={name} onChange={(e) => setName(e.target.value)} />

      {permissions.isLoading && <p className="text-sm text-muted-foreground">Cargando permisos...</p>}
      {permissions.data && (
        <PermissionMatrix permissions={permissions.data} selected={selected} onChange={setSelected} />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
