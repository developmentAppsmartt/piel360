import { RegisterForm } from "@/components/auth/register-form";

export default function PatientRegisterPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold">Registro de paciente</h1>
      <RegisterForm role="patient" loginHref="/patient/login" />
    </main>
  );
}
