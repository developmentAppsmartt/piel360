import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function DoctorLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-12" />
      <h1 className="text-2xl font-semibold">Ingresar como profesional</h1>
      <LoginForm role="doctor" registerHref="/doctor/register" />
      <p className="max-w-sm text-center text-sm text-zinc-500">
        ¿Representas una empresa?{" "}
        <Link href="/doctor/login/empresa" className="font-medium text-sky-600 underline">
          Inicio de sesión empresarial
        </Link>
        {" · "}
        <Link href="/doctor/register/empresa" className="font-medium text-sky-600 underline">
          Registro empresarial
        </Link>
      </p>
    </main>
  );
}
