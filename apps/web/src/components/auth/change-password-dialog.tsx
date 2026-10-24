"use client";

import { useState } from "react";
import { isStrongPassword, PASSWORD_STRENGTH_MESSAGE } from "@piel360/shared";
import {
  Aviso,
  CampoCodigo,
  CamposPasswordNueva,
  inputClass,
  LARGO_CODIGO,
} from "@/components/auth/account-security-fields";
import { PasswordVisibilityToggle } from "@/components/auth/auth-form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cambiarPassword,
  enviarCodigoCambioPassword,
  verificarCodigoCambioPassword,
  verificarPasswordActual,
} from "@/lib/account-security-client";

type MetodoPassword = "actual" | "email" | "phone";

export function DialogoPassword({
  open,
  onOpenChange,
  phone,
  onHecho,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dígitos con indicativo. Sin celular, el método SMS no se ofrece. */
  phone: string;
  onHecho: (mensaje: string) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPassword>("actual");
  const [passwordActual, setPasswordActual] = useState("");
  const [verActual, setVerActual] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  function reiniciar() {
    setMetodo("actual");
    setPasswordActual("");
    setCodigo("");
    setToken("");
    setPassword("");
    setConfirmacion("");
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
    setPendiente(true);
    const canal = metodo === "phone" ? "phone" : "email";
    const result = await enviarCodigoCambioPassword(
      canal,
      canal === "phone" ? phone : undefined,
    );
    setPendiente(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setOk(
      canal === "phone"
        ? "Te enviamos un código por SMS."
        : "Te enviamos un código a tu correo.",
    );
  }

  async function probarIdentidad() {
    setError(null);
    setOk(null);

    if (metodo === "actual") {
      if (!passwordActual) {
        setError("Escribe tu contraseña actual.");
        return;
      }
      setPendiente(true);
      const result = await verificarPasswordActual(passwordActual);
      setPendiente(false);
      if (!result.ok || !result.token) {
        setError(result.error ?? "No se pudo verificar la contraseña.");
        return;
      }
      setToken(result.token);
      return;
    }

    if (codigo.length !== LARGO_CODIGO) {
      setError(`El código tiene ${LARGO_CODIGO} dígitos.`);
      return;
    }
    setPendiente(true);
    const result = await verificarCodigoCambioPassword(
      metodo,
      codigo,
      metodo === "phone" ? phone : undefined,
    );
    setPendiente(false);
    if (!result.ok || !result.token) {
      setError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setToken(result.token);
  }

  async function guardar() {
    setError(null);
    if (!isStrongPassword(password)) {
      setError(PASSWORD_STRENGTH_MESSAGE);
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPendiente(true);
    const result = await cambiarPassword(token, password);
    setPendiente(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    reiniciar();
    onOpenChange(false);
    onHecho(
      "Tu contraseña se actualizó. Úsala la próxima vez que inicies sesión.",
    );
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {token ? (
            <>
              <p className="text-sm text-muted-foreground">
                Listo. Ahora escribe tu nueva contraseña.
              </p>
              <CamposPasswordNueva
                password={password}
                onPassword={setPassword}
                confirmacion={confirmacion}
                onConfirmacion={setConfirmacion}
              />
              <Aviso error={error} ok={null} />
              <Button
                type="button"
                className="w-full"
                disabled={pendiente}
                onClick={() => void guardar()}
              >
                {pendiente ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  ¿Cómo quieres confirmar que eres tú?
                </legend>
                {(
                  [
                    ["actual", "Con mi contraseña actual"],
                    ["email", "Con un código a mi correo"],
                    ...(phone
                      ? ([["phone", "Con un código por SMS"]] as const)
                      : []),
                  ] as [MetodoPassword, string][]
                ).map(([valor, etiqueta]) => (
                  <label
                    key={valor}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="metodo-password"
                      checked={metodo === valor}
                      onChange={() => {
                        setMetodo(valor);
                        setCodigo("");
                        setError(null);
                        setOk(null);
                      }}
                    />
                    {etiqueta}
                  </label>
                ))}
              </fieldset>

              {metodo === "actual" ? (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Contraseña actual</span>
                  <div className="relative">
                    <input
                      type={verActual ? "text" : "password"}
                      className={`${inputClass} pr-11`}
                      value={passwordActual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      autoComplete="current-password"
                    />
                    <PasswordVisibilityToggle
                      visible={verActual}
                      onToggle={() => setVerActual((v) => !v)}
                    />
                  </div>
                </label>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={pendiente}
                    onClick={() => void enviarCodigo()}
                  >
                    {pendiente ? "Enviando…" : "Enviarme el código"}
                  </Button>
                  <CampoCodigo
                    value={codigo}
                    onChange={setCodigo}
                    onResend={() => void enviarCodigo()}
                    disabled={pendiente}
                  />
                </>
              )}

              <Aviso error={error} ok={ok} />
              <Button
                type="button"
                className="w-full"
                disabled={pendiente}
                onClick={() => void probarIdentidad()}
              >
                {pendiente ? "Verificando…" : "Continuar"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
