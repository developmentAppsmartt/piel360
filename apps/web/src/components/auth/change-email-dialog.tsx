"use client";

import { useState } from "react";
import {
  Aviso,
  CampoCodigo,
  inputClass,
  LARGO_CODIGO,
} from "@/components/auth/account-security-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cambiarCorreo,
  enviarCodigoCorreoNuevo,
} from "@/lib/account-security-client";

export function DialogoCorreo({
  open,
  onOpenChange,
  correoActual,
  onCambiado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correoActual: string;
  onCambiado: (mensaje: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  function reiniciar() {
    setEmail("");
    setCodigo("");
    setEnviado(false);
    setError(null);
    setOk(null);
  }

  function cerrar(abierto: boolean) {
    if (!abierto) reiniciar();
    onOpenChange(abierto);
  }

  async function enviarCodigo() {
    setError(null);
    setOk(null);
    const normalizado = email.trim().toLowerCase();
    if (!normalizado) {
      setError("Escribe tu correo nuevo.");
      return;
    }
    if (normalizado === correoActual.trim().toLowerCase()) {
      setError("Ese ya es tu correo actual.");
      return;
    }
    setPendiente(true);
    const result = await enviarCodigoCorreoNuevo(normalizado);
    setPendiente(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setEnviado(true);
    setOk("Te enviamos un código al correo nuevo.");
  }

  async function confirmar() {
    setError(null);
    if (codigo.length !== LARGO_CODIGO) {
      setError(`El código tiene ${LARGO_CODIGO} dígitos.`);
      return;
    }
    setPendiente(true);
    const result = await cambiarCorreo(email, codigo);
    setPendiente(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo cambiar el correo.");
      return;
    }
    const nuevo = email.trim().toLowerCase();
    reiniciar();
    onOpenChange(false);
    onCambiado(`Tu correo de acceso ahora es ${nuevo}.`);
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar correo de acceso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Te enviamos un código al correo nuevo para comprobar que es tuyo.
            Al anterior le avisamos del cambio.
          </p>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Correo nuevo</span>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEnviado(false);
              }}
              autoComplete="email"
              placeholder="tu@email.com"
            />
          </label>

          {enviado ? (
            <CampoCodigo
              value={codigo}
              onChange={setCodigo}
              onResend={() => void enviarCodigo()}
              disabled={pendiente}
            />
          ) : null}

          <Aviso error={error} ok={ok} />

          <Button
            type="button"
            className="w-full"
            disabled={pendiente}
            onClick={() => void (enviado ? confirmar() : enviarCodigo())}
          >
            {pendiente
              ? enviado
                ? "Cambiando…"
                : "Enviando…"
              : enviado
                ? "Cambiar correo"
                : "Enviarme el código"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
