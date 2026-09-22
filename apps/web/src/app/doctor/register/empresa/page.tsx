import { EmpresaRegisterForm } from "@/components/auth/empresa-register-form";

type EmpresaRegisterPageProps = {
  searchParams: Promise<{ ref?: string; aliada?: string }>;
};

export default async function EmpresaRegisterPage({
  searchParams,
}: EmpresaRegisterPageProps) {
  const params = await searchParams;
  const referralCode = params.ref?.trim() || undefined;

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-4 py-10 sm:px-8 sm:py-14">
      <EmpresaRegisterForm referralCode={referralCode} />
    </main>
  );
}
