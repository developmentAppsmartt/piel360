"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import { PROFILE_PHOTO_MIME, profilePhotoError } from "@piel360/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromEmail } from "@/lib/initials";
import { useDeleteAvatar, useUploadAvatar } from "@/lib/queries/profile-photo";

/** Foto de perfil del usuario en sesión. Se guarda al elegirla, aparte del
 * «Guardar cambios» del formulario (igual que en la app móvil). */
export function ProfilePhotoField({
  avatarUrl,
  email,
}: {
  avatarUrl: string | null | undefined;
  /** Para las iniciales cuando no hay foto, como en la cabecera. */
  email: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();
  const [error, setError] = useState<string | null>(null);
  const busy = upload.isPending || remove.isPending;

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Sin limpiar, elegir otra vez el mismo archivo no dispara `change`.
    e.target.value = "";
    if (!file) return;
    const invalid = profilePhotoError(file);
    setError(invalid);
    if (invalid) return;
    upload.mutate(file, {
      onError: (err) => setError(err.message || "No se pudo subir la foto."),
    });
  }

  function onRemove() {
    if (!window.confirm("¿Eliminar tu foto de perfil?")) return;
    setError(null);
    remove.mutate(undefined, {
      onError: (err) => setError(err.message || "No se pudo eliminar la foto."),
    });
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Avatar className="size-20">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
        <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
          {initialsFromEmail(email)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Foto de perfil</h3>
          <p className="text-xs text-muted-foreground">PNG o JPG, máximo 10 MB.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" />
            {upload.isPending
              ? "Subiendo…"
              : avatarUrl
                ? "Cambiar foto"
                : "Subir foto"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_MIME.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPick}
      />
    </section>
  );
}
