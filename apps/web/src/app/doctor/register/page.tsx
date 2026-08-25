import { DoctorRegisterForm } from "@/components/auth/doctor-register-form";

export default function DoctorRegisterPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-white px-4 py-10 sm:px-8 sm:py-14">
      <DoctorRegisterForm />
    </main>
  );
}
