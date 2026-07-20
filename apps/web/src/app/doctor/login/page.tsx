import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function DoctorLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-10" />
      <h1 className="text-2xl font-semibold">Ingresar como doctor</h1>
      <LoginForm role="doctor" registerHref="/doctor/register" />
    </main>
  );
}
