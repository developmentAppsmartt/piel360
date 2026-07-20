import Link from "next/link";

// Landing pública del paciente (MIGRACION.md §2.1: GET /patient → patient.landing).
// Mismo criterio de arquitectura que app/doctor/page.tsx (ver comentario ahí).
export default function PatientLanding() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Piel360 para pacientes</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Análisis de piel asistido por IA, en cualquier momento.
      </p>
      <div className="flex gap-4">
        <Link href="/patient/login" className="underline">
          Iniciar sesión
        </Link>
        <Link href="/patient/register" className="underline">
          Registrarme
        </Link>
      </div>
    </main>
  );
}
