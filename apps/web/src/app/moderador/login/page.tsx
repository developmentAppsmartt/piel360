import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

/** Login del moderador — misma API/cookies que `/admin/login`; el rol real lo decide el backend. */
export default function ModeradorLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-12" />
      <h1 className="text-2xl font-semibold">Ingresar como moderador</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Panel de verificación de profesionales y empresas
      </p>
      <LoginForm role="monitor" />
      <Link href="/moderador" className="text-sm text-zinc-500 underline">
        Volver
      </Link>
    </main>
  );
}
