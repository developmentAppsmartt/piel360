"use client";

import { useQueryClient } from "@tanstack/react-query";

/**
 * El QueryClient vive en el layout raíz y no se recrea al cambiar de cuenta
 * (login/logout son server actions). Hay que vaciarlo a mano o el panel nuevo
 * sigue mostrando datos del usuario anterior (`["doctors","me"]`, etc.).
 */
export function useClearClientQueryCache() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.clear();
  };
}
