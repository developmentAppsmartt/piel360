import Link from "next/link";
import { Apple, Smartphone } from "lucide-react";

/**
 * Los pacientes ya no acceden por web: el proxy manda aquí todo `/patient/*`
 * (login, registro y panel). Esta página existe para que quien llegue con un
 * enlace guardado entienda qué pasó, en vez de caer en un redirect mudo.
 *
 * Sin botones de tienda a propósito: todavía no hay URLs reales de App Store /
 * Google Play en el proyecto. Cuando existan, se añaden aquí.
 */
export default function PatientAppOnlyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Tu cuenta se usa desde la app
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          El acceso de pacientes a PIEL360 es exclusivo de la aplicación móvil.
          Desde ahí puedes ver tus análisis, tu historial y tus citas.
        </p>

        <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-primary">PIEL360</span> está
            disponible para Android e iOS. La app es necesaria para realizar
            análisis de piel.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Apple className="size-3.5" />
              iOS 13.0 o superior
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="size-3.5" />
              Android 8.0 o superior
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-slate-500 underline-offset-2 hover:text-primary hover:underline"
          >
            Volver al inicio
          </Link>
          <span className="text-zinc-300">·</span>
          <Link
            href="/doctor/login"
            className="text-slate-500 underline-offset-2 hover:text-primary hover:underline"
          >
            ¿Eres profesional? Inicia sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
