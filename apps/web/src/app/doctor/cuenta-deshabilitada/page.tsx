import { redirect } from "next/navigation";
import { Ban, LifeBuoy, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { logoutAction } from "@/lib/actions/auth";
import { fetchSessionStateFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";

const SUPPORT_EMAIL = "soporte@piel360.com";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AccountDisabledPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");

  const { account } = await fetchSessionStateFromCookies();
  if (account && !account.disabled) redirect("/doctor/home");

  const since = formatDate(account?.disabledAt ?? null);
  const byOrganization = account?.disabledScope === "organization";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F6FA] px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-primary/10 blur-2xl" />

      <section className="relative w-full max-w-xl rounded-[1.75rem] border border-border bg-white p-6 text-center shadow-xl sm:p-10">
        <div className="flex justify-center">
          <Logo className="h-16" />
        </div>

        <div className="mx-auto mt-6 flex size-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Ban className="size-8" aria-hidden />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
          {byOrganization ? "Tu empresa está deshabilitada" : "Tu cuenta está deshabilitada"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {byOrganization
            ? "El administrador de Piel 360 deshabilitó la cuenta de la empresa a la que perteneces, por lo que no puedes usar la plataforma por ahora."
            : "El administrador de Piel 360 deshabilitó tu cuenta, por lo que no puedes usar la plataforma por ahora."}
          {since ? ` Deshabilitada desde el ${since}.` : null}
        </p>

        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-4 text-left">
          <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">
            Motivo
          </p>
          <p className="mt-1.5 text-sm whitespace-pre-line text-foreground sm:text-base">
            {account?.disabledReason?.trim() || "No se registró una observación."}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <LifeBuoy className="size-4" />
            Contactar a soporte
          </a>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          ¿Crees que es un error? Escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
