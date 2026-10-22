"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { DialogoCorreo } from "@/components/auth/change-email-dialog";
import { DialogoPassword } from "@/components/auth/change-password-dialog";
import { Button } from "@/components/ui/button";

/**
 * Acceso y seguridad de la cuenta. Va FUERA del `<form>` del perfil: ese es un
 * único formulario con su propio submit, y anidar otro es HTML inválido.
 */
export function AccountSecuritySection({
  email,
  phone = "",
  onEmailChanged,
}: {
  email: string;
  /** Dígitos con indicativo. Sin celular no se ofrece el código por SMS. */
  phone?: string;
  onEmailChanged: () => void;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [correoOpen, setCorreoOpen] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Acceso y seguridad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu correo es tu usuario de acceso; para cambiarlo verificamos el nuevo
          con un código.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPasswordOpen(true)}
        >
          <KeyRound className="mr-1 size-4" />
          Cambiar contraseña
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCorreoOpen(true)}
        >
          <Mail className="mr-1 size-4" />
          Cambiar correo
        </Button>
      </div>

      {mensaje ? (
        <p className="text-sm text-emerald-700" role="status">
          {mensaje}
        </p>
      ) : null}

      <DialogoPassword
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        phone={phone}
        onHecho={setMensaje}
      />
      <DialogoCorreo
        open={correoOpen}
        onOpenChange={setCorreoOpen}
        correoActual={email}
        onCambiado={(texto) => {
          setMensaje(texto);
          onEmailChanged();
        }}
      />
    </section>
  );
}
