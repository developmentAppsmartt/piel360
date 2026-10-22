"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { isStrongPassword, PASSWORD_STRENGTH_MESSAGE } from "@piel360/shared";
import { PasswordVisibilityToggle } from "@/components/auth/auth-form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import {
  cambiarCorreo,
  cambiarPassword,
  enviarCodigoCambioPassword,
  enviarCodigoCorreoNuevo,
  verificarCodigoCambioPassword,
  verificarPasswordActual,
} from "@/lib/account-security-client";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

/** El código del OTP es de 5 dígitos en todo el producto (registro, reset y
 * SMS) — ver `randomInt(10000, 100000)` en auth.service.ts. */
const LARGO_CODIGO = 5;

type MetodoPassword = "actual" | "email" | "phone";

function Aviso({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (ok) return <p className="text-sm text-emerald-700">{ok}</p>;
  return null;
}

function CampoCodigo({
  value,
  onChange,
  onResend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onResend: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Código de verificación</span>
        <input
          className={inputClass}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, LARGO_CODIGO))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="00000"
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onResend}
        className="text-sm text-primary underline-offset-2 hover:underline disabled:opacity-60"
      >
        Reenviar código
      </button>
    </>
  );
}

/** Nueva contraseña + confirmación. Lo comparten los tres métodos: una vez se
 * probó la identidad, el token es el mismo. */
function CamposPasswordNueva({
  password,
  onPassword,
  confirmacion,
  onConfirmacion,
}: {
  password: string;
  onPassword: (v: string) => void;
  confirmacion: string;
  onConfirmacion: (v: string) => void;
}) {
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  const [enfocado, setEnfocado] = useState(false);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Nueva contraseña</span>
        <div className="relative">
          <input
            type={verPassword ? "text" : "password"}
            className={`${inputClass} pr-11`}
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            autoComplete="new-password"
            placeholder="Crea una contraseña segura"
          />
          <PasswordVisibilityToggle
            visible={verPassword}
            onToggle={() => setVerPassword((v) => !v)}
          />
          {enfocado && password ? (
            <PasswordRequirements password={password} />
          ) : null}
        </div>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Confirmar contraseña</span>
        <div className="relative">
          <input
            type={verConfirmacion ? "text" : "password"}
            className={`${inputClass} pr-11`}
            value={confirmacion}
            onChange={(e) => onConfirmacion(e.target.value)}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
          />
          <PasswordVisibilityToggle
            visible={verConfirmacion}
            onToggle={() => setVerConfirmacion((v) => !v)}
          />
        </div>
      </label>
    </>
  );
}

function DialogoPassword({
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

function DialogoCorreo({
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
