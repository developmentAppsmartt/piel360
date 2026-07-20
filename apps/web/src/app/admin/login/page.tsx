import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";

// Sin auto-registro: los admins se crean por seed o desde el propio panel admin.
export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <Logo className="h-10" />
      <h1 className="text-2xl font-semibold">Ingresar como administrador</h1>
      <LoginForm role="admin" />
    </main>
  );
}
