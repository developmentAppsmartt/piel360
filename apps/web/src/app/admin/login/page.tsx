import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

// Sin auto-registro: los admins se crean por seed o desde el propio panel admin.
export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-12" />
      <h1 className="text-2xl font-semibold">Ingresar como administrador</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Acceso al backoffice de Piel360
      </p>
      <LoginForm role="superadmin" />
      <Link href="/administrador" className="text-sm text-zinc-500 underline">
        Volver
      </Link>
    </main>
  );
}
