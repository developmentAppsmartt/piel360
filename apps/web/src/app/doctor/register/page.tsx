import Link from "next/link";
import { DoctorRegisterForm } from "@/components/auth/doctor-register-form";
import { Logo } from "@/components/layout/logo";

type DoctorRegisterPageProps = {
  searchParams: Promise<{ ref?: string; aliada?: string }>;
};

export default async function DoctorRegisterPage({
  searchParams,
}: DoctorRegisterPageProps) {
  const params = await searchParams;
  const referralCode = params.ref?.trim() || undefined;

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-4 py-10 sm:px-8 sm:py-14">
      <div className="mb-6 flex w-full max-w-3xl justify-center">
        <Link href="/" aria-label="Ir al inicio">
          <Logo className="h-12" />
        </Link>
      </div>
      <DoctorRegisterForm referralCode={referralCode} />
    </main>
  );
}
