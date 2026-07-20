import Link from "next/link";

// Landing pública del doctor (MIGRACION.md §2.1: GET /doctor → doctor.landing).
// Nota de arquitectura: esta página vive en app/doctor/page.tsx (no en un grupo
// (public) separado) porque el panel autenticado también cuelga de /doctor/*
// (ver app/doctor/(panel)/) — dos carpetas distintas resolviendo a la misma
// URL /doctor no es válido en Next.js App Router.
export default function DoctorLanding() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Piel360 para doctores</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Diagnóstico dermatológico asistido por IA para tu consulta.
      </p>
      <div className="flex gap-4">
        <Link href="/doctor/login" className="underline">
          Iniciar sesión
        </Link>
        <Link href="/doctor/register" className="underline">
          Registrarme
        </Link>
      </div>
    </main>
  );
}
