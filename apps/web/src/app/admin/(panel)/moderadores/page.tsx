"use client";

import { ModeratorsHeader, ModeratorsTable } from "@/components/admin/moderators-table";
import { useModerators } from "@/lib/queries/moderators";

export default function ModeradoresPage() {
  const query = useModerators();

  return (
    <div className="space-y-6">
      <ModeratorsHeader />
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar la lista de moderadores.
        </p>
      ) : (
        <ModeratorsTable moderators={query.data ?? []} />
      )}
    </div>
  );
}
