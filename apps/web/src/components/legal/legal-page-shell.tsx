import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

/** Marco de las páginas públicas de términos y privacidad. */
export function LegalPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F5F6FA] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/" aria-label="Inicio">
          <Logo className="h-12" />
        </Link>
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">{children}</div>
        <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terminos" className="hover:text-foreground hover:underline">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-foreground hover:underline">
            Política de tratamiento de datos
          </Link>
        </nav>
      </div>
    </main>
  );
}
