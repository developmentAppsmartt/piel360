import { DoctorRegisterForm } from "@/components/auth/doctor-register-form";

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
      <DoctorRegisterForm referralCode={referralCode} />
    </main>
  );
}
