"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

/**
 * Foto del paciente (la que configura en la app) o sus iniciales.
 *
 * Usa la miniatura de 160 px, no la original (1,5–3 MB): la tabla solo pinta
 * la página visible y, con `loading="lazy"`, el navegador baja únicamente las
 * que entran en pantalla. Si la URL falla (firma vencida, archivo borrado)
 * vuelve a las iniciales.
 */
export function PatientAvatar({
  firstName,
  lastName,
  thumbUrl,
  className,
}: {
  firstName: string;
  lastName: string;
  thumbUrl?: string | null;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(thumbUrl) && failedUrl !== thumbUrl;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-blue-200 font-bold text-[#1e5a9e] dark:from-sky-900 dark:to-blue-900 dark:text-sky-200",
        className,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3
        <img
          src={thumbUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          width={160}
          height={160}
          className="size-full object-cover"
          onError={() => setFailedUrl(thumbUrl ?? null)}
        />
      ) : (
        initials(firstName, lastName)
      )}
    </div>
  );
}
