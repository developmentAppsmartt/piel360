"use client";

import { useRef, useState } from "react";
import { AccountSecuritySection } from "@/components/auth/account-security-section";
import { ProfilePhotoField } from "@/components/profile/profile-photo-field";
import { Button } from "@/components/ui/button";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import {
  CompanyProfileSection,
  type CompanyProfileHandle,
} from "./company-profile-section";
import { VerificationNoteBanner } from "./verification-note-banner";

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
    <div className="max-w-4xl space-y-6">
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Cuenta empresa</h2>
        <p className="text-sm text-muted-foreground">
          Administra los datos comerciales y del representante legal de tu
          organización. Esta es tu única cuenta de acceso al panel.
        </p>
      </div>

      <ProfilePhotoField
        avatarUrl={account.avatarUrl}
        email={account.user?.email ?? ""}
      />

      <VerificationNoteBanner
        status={account.verificationStatus}
        note={account.verificationNote}
      />

      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
        <p>
          <span className="font-medium text-foreground">Correo de acceso: </span>
          <span className="text-muted-foreground">
            {account.user?.email ?? "—"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Se cambia abajo, en Acceso y seguridad. Los datos comerciales y del
          representante legal se editan aquí.
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

    <AccountSecuritySection
      email={account.user?.email ?? ""}
      phone={account.phone ?? ""}
      onEmailChanged={() => void profile.refetch()}
    />
    </div>
  );
}
