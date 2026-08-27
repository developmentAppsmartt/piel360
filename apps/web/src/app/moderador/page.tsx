import Link from "next/link";

/** Landing pública del moderador (rol `monitor`). */
export default function ModeradorLanding() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Piel360 para moderadores
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Verifica profesionales y empresas antes de activar su acceso a la
        plataforma.
      </p>
      <div className="flex gap-4">
        <Link href="/moderador/login" className="underline">
          Iniciar sesión
        </Link>
        <Link href="/" className="underline text-zinc-500">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
