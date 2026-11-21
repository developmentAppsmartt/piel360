"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Paperclip, ShieldCheck, X } from "lucide-react";
import { SUPPORT_ATTACHMENT_MAX_BYTES, SUPPORT_REQUEST_TYPES } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { useSendSupportRequest } from "@/lib/queries/support";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      {children}
    </div>
  );
}

/** «Enviar una solicitud de asistencia»: sale por correo a soporte con
 * respuesta directa a quien la envía. `key` del padre lo reinicia al cambiar
 * el perfil, así los valores iniciales se toman una vez. */
export function SupportRequestForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string;
  defaultName: string;
}) {
  const send = useSendSupportRequest();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function pickFile(next: File | null) {
    setError(null);
    if (next && next.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      setError("El adjunto no puede pasar de 5 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(next);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.delete("attachment");
    if (file) data.append("attachment", file);
    try {
      await send.mutateAsync(data);
      form.reset();
      setFile(null);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar tu solicitud. Inténtalo de nuevo.");
    }
  }

  if (sent) {
    return (
      <ModuleCard className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-12 text-emerald-600" aria-hidden />
        <h2 className="text-lg font-bold">Recibimos tu solicitud</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Nuestro equipo te responderá al correo que dejaste lo antes posible.
        </p>
        <Button type="button" variant="outline" onClick={() => setSent(false)}>
          Enviar otra solicitud
        </Button>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard className="p-5 sm:p-6">
      <div className="border-l-4 border-primary pl-3">
        <h2 className="text-lg font-bold text-foreground">Enviar una solicitud de asistencia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Por favor, completa el siguiente formulario para enviar una solicitud de asistencia.
          Describe tu problema y nos pondremos en contacto contigo lo antes posible.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
        <Field id="support-email" label="Correo electrónico">
          <input id="support-email" name="email" type="email" required defaultValue={defaultEmail} className={inputClass} />
        </Field>
        <Field id="support-name" label="Nombre completo">
          <input id="support-name" name="fullName" required maxLength={150} defaultValue={defaultName} className={inputClass} />
        </Field>
        <Field id="support-subject" label="Asunto">
          <input id="support-subject" name="subject" required maxLength={200} className={inputClass} />
        </Field>
        <Field id="support-type" label="Tipo de solicitud">
          <select id="support-type" name="type" required defaultValue="platform" className={inputClass}>
            {SUPPORT_REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="support-message" label="Mensaje">
          <textarea id="support-message" name="message" required rows={5} maxLength={5000} className={inputClass} />
        </Field>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            ref={fileRef}
            id="support-attachment"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="support-attachment"
            className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <Paperclip className="size-4" aria-hidden />
            Adjuntar archivo (opcional)
          </label>
          {file ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
              {file.name}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Quitar adjunto"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Imagen o PDF, hasta 5 MB.</span>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Al enviar tu solicitud, aceptas nuestra política de privacidad y el tratamiento de tus datos
          para brindarte soporte.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={send.isPending}>
          {send.isPending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </form>
    </ModuleCard>
  );
}
