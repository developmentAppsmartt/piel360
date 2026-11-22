"use client";

import { TawkToWidget } from "@/components/shared/tawk-to-widget";
import { SupportHelpCard } from "@/components/support/support-help-card";
import { SupportRequestForm } from "@/components/support/support-request-form";
import { useMyDoctorProfile } from "@/lib/queries/doctors";

export default function SoportePage() {
  const profile = useMyDoctorProfile();
  const email = profile.data?.user.email ?? "";
  const name = profile.data ? `${profile.data.firstName} ${profile.data.lastName}`.trim() : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Soporte</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Estamos aquí para ayudarte. Cuéntanos qué necesitas y nuestro equipo te responderá lo antes
          posible.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        {/* `key`: el perfil llega después del primer render y el formulario
            toma sus valores iniciales una sola vez. */}
        <SupportRequestForm key={email || "cargando"} defaultEmail={email} defaultName={name} />
        <SupportHelpCard />
      </div>

      <TawkToWidget />
    </div>
  );
}
