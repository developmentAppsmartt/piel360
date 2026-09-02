"use client";

import { useState } from "react";
import { googleAuthStartUrl } from "@/lib/google-auth";

export function GoogleContinueButton({
  role,
  label = "Continuar con Google",
}: {
  role: "doctor" | "patient";
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.assign(googleAuthStartUrl(role));
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      <GoogleIcon />
      {pending ? "Redirigiendo…" : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6s2.5-5.6 5.6-5.6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.9 3.6 14.7 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.7H12z"
      />
    </svg>
  );
}
