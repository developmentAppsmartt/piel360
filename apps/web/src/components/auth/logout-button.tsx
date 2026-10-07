"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { useClearClientQueryCache } from "@/lib/clear-client-query-cache";

export function LogoutButton() {
  const clearClientCache = useClearClientQueryCache();
  return (
    <form
      action={async () => {
        clearClientCache();
        await logoutAction();
      }}
    >
      <Button type="submit" variant="outline">
        Cerrar sesión
      </Button>
    </form>
  );
}
