"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import {
  CompanyProfileSection,
  type CompanyProfileHandle,
} from "./company-profile-section";

export function EmpresaAccountForm() {
  const companyRef = useRef<CompanyProfileHandle>(null);
  const profile = useMyDoctorProfile();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!companyRef.current?.isReady()) {
      setError("Aún se está cargando la información de tu empresa.");
      return;
    }

    setSaving(true);
    try {
      await companyRef.current.save();
      setMessage("Información de empresa actualizada.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la información de empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (profile.isPending) {
    return (
      <p className="text-sm text-muted-foreground">Cargando tu cuenta…</p>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la información de tu cuenta empresa.
      </p>
    );
  }

  const account = profile.data;

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Cuenta empresa</h2>
        <p className="text-sm text-muted-foreground">
          Administra los datos comerciales y del representante legal de tu
          organización. Esta es tu única cuenta de acceso al panel.
        </p>
      </div>

      {account.verificationNote &&
      (account.verificationStatus === "in_review" ||
        account.verificationStatus === "rejected" ||
        account.verificationStatus === "pending") ? (
        <div
          className={
            account.verificationStatus === "rejected"
              ? "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          }
          role="status"
        >
          <p className="font-semibold">
            {account.verificationStatus === "rejected"
              ? "Tu solicitud fue rechazada"
              : "El equipo de verificación solicitó ajustes"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{account.verificationNote}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
        <p>
          <span className="font-medium text-foreground">Correo de acceso: </span>
          <span className="text-muted-foreground">
            {account.user?.email ?? "—"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          El correo de acceso no se puede cambiar desde aquí. Los datos
          comerciales y del representante legal se editan abajo.
        </p>
      </div>

      <CompanyProfileSection ref={companyRef} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
