import type { Metadata } from "next";
import { HomeLanding } from "@/components/landing/home-landing";

export const metadata: Metadata = {
  title: "Ingresar · PIEL 360",
  robots: { index: false },
};

/** Los tres accesos (profesional, administrador, moderador). Antes eran la
 * página de inicio; ahora `/` es la landing comercial. */
export default function IngresarPage() {
  return <HomeLanding />;
}
