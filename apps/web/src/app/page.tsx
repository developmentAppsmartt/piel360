import Link from "next/link";

// Landing pública (MIGRACION.md §2.1: GET / → home). Contenido real: Semana 5 de PLAN-MIGRACION.md.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Piel360</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Plataforma de diagnóstico dermatológico asistido por IA.
      </p>
      <div className="flex gap-4">
        <Link href="/doctor" className="underline">
          Soy doctor
        </Link>
        <Link href="/patient" className="underline">
          Soy paciente
        </Link>
      </div>
    </main>
  );
}
