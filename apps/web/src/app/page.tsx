import Link from "next/link";
import { Logo } from "@/components/layout/logo";

// Landing pública (MIGRACION.md §2.1: GET / → home).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <Logo className="h-16" />
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Plataforma de diagnóstico dermatológico asistido por IA.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/doctor" className="underline">
          Soy doctor
        </Link>
        <Link href="/patient" className="underline">
          Soy paciente
        </Link>
        <Link href="/administrador" className="underline">
          Soy administrador
        </Link>
        <Link href="/moderador" className="underline">
          Soy moderador
        </Link>
      </div>
    </main>
  );
}
