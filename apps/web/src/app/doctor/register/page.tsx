import { RegisterForm } from "@/components/auth/register-form";

export default function DoctorRegisterPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold">Registro de doctor</h1>
      <RegisterForm role="doctor" loginHref="/doctor/login" />
    </main>
  );
}
