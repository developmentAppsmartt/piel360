"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

/** `POST /support/requests` (multipart por el adjunto opcional). */
export function useSendSupportRequest() {
  return useMutation({
    mutationFn: (form: FormData) =>
      apiClientFetch<{ ok: true }>("/support/requests", { method: "POST", body: form }),
  });
}
