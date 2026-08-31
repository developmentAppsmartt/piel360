import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function EmpresaLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-12" />
      <h1 className="text-2xl font-semibold">Ingresar como empresa</h1>
      <p className="max-w-sm text-center text-sm text-zinc-500">
        Accede al panel de tu organización, equipo y planes empresariales.
      </p>
      <LoginForm role="empresa" registerHref="/doctor/register/empresa" />
      <p className="max-w-sm text-center text-sm text-zinc-500">
        ¿Eres profesional individual?{" "}
        <Link href="/doctor/login" className="font-medium text-sky-600 underline">
          Inicio de sesión profesional
        </Link>
      </p>
    </main>
  );
}
