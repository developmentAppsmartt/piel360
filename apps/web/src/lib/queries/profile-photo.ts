"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

/** La foto vive en el perfil (`avatarUrl` de `GET /doctors/me`): se vuelve a
 * pedir para que la cabecera, el menú lateral y Configuración la muestren sin
 * recargar. */
function useRefreshProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["doctors", "me"] });
}

export function useUploadAvatar() {
  const refreshProfile = useRefreshProfile();
  return useMutation({
    mutationFn: (photo: File) => {
      const form = new FormData();
      form.set("avatar", photo);
      return apiClientFetch<{ avatarUrl: string | null }>("/me/avatar", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: refreshProfile,
  });
}

export function useDeleteAvatar() {
  const refreshProfile = useRefreshProfile();
  return useMutation({
    mutationFn: () =>
      apiClientFetch<{ avatarUrl: null }>("/me/avatar", { method: "DELETE" }),
    onSuccess: refreshProfile,
  });
}
