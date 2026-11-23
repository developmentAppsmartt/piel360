import { redirect } from "next/navigation";
import { FileCheck2, LogOut } from "lucide-react";
import { TERMS_OF_USE } from "@piel360/shared";
import { AcceptTermsForm } from "@/components/legal/accept-terms-form";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { Logo } from "@/components/layout/logo";
import { logoutAction } from "@/lib/actions/auth";
import { fetchSessionStateFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";

/** Solo entra aquí quien no ha aceptado la versión vigente (lo manda el proxy). */
function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/doctor/") && !value.startsWith("/doctor/aceptar-terminos")
    ? value
    : "/doctor/home";
}

export default async function AceptarTerminosPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  const next = safeNext((await searchParams).next);

  const { account } = await fetchSessionStateFromCookies();
  if (account?.termsAccepted !== false) redirect(next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F6FA] px-4 py-10">
      <section className="w-full max-w-2xl rounded-[1.75rem] border border-border bg-white p-6 shadow-xl sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <Logo className="h-12" />
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileCheck2 className="size-6" aria-hidden />
          </span>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Antes de continuar, lee y acepta los Términos y Condiciones y la Política de Tratamiento de
          Datos Personales de PIEL360.
        </p>
        <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-2xl border border-border p-4">
          <LegalDocumentView doc={TERMS_OF_USE} compact />
        </div>
        <div className="mt-5">
          <AcceptTermsForm next={next} />
        </div>
        <form action={logoutAction} className="mt-4 text-center">
          <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
