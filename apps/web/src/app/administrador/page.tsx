import Link from "next/link";

/** Landing pública del super admin (fuera de `/admin` para no chocar con el panel). */
export default function AdministradorLanding() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Piel360 para administradores
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Backoffice: usuarios, planes, reportes y configuración de la plataforma.
      </p>
      <div className="flex gap-4">
        <Link href="/admin/login" className="underline">
          Iniciar sesión
        </Link>
        <Link href="/" className="underline text-zinc-500">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
