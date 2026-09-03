"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeGoogleCodeAction } from "@/lib/actions/auth";

function GoogleAuthCallbackInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const roleRaw = searchParams.get("role");
    const expectedRole =
      roleRaw === "doctor" || roleRaw === "patient" ? roleRaw : undefined;

    if (!code) {
      setError("No recibimos el código de Google. Vuelve a intentarlo.");
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await exchangeGoogleCodeAction(code, expectedRole);
      if (cancelled) return;
      if (result?.error) setError(result.error);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {error ? (
        <>
          <h1 className="text-lg font-semibold text-slate-900">
            No se pudo iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <a
            href="/doctor/login"
            className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Volver al inicio de sesión
          </a>
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-slate-900">
            Conectando con Google…
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Un momento mientras preparamos tu sesión.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Destino web tras el OAuth de Google (FRONTEND_URL/auth/google/callback).
 * La API redirige aquí con `?code=` de un solo uso; lo canjeamos por cookies.
 */
export default function GoogleAuthCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f7fb] px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Conectando con Google…
            </h1>
          </div>
        }
      >
        <GoogleAuthCallbackInner />
      </Suspense>
    </main>
  );
}
