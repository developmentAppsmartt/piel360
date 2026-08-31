import Link from "next/link";

export default function EmpresaLandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Piel360 para empresas</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Gestiona tu equipo, planes y operación clínica desde un solo panel.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/doctor/login/empresa" className="underline">
          Iniciar sesión
        </Link>
        <Link href="/doctor/register/empresa" className="underline">
          Registrarme
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        ¿Eres profesional individual?{" "}
        <Link href="/doctor" className="underline">
          Acceso profesional
        </Link>
      </p>
    </main>
  );
}
