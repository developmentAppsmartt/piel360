"use client";

import { cn } from "@/lib/utils";

export function LayeredAnalysisImage({
  photoUrl,
  maskUrl,
  alt,
  className,
  fit = "cover",
}: {
  photoUrl?: string | null;
  maskUrl?: string | null;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  if (!photoUrl && !maskUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/40 text-[10px] text-muted-foreground",
          className,
        )}
      >
        Sin imagen
      </div>
    );
  }

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={cn("relative overflow-hidden bg-neutral-900", className)}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={alt}
          draggable={false}
          className={cn("absolute inset-0 size-full", fitClass)}
        />
      ) : null}
      {maskUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={maskUrl}
          alt=""
          draggable={false}
          className={cn("absolute inset-0 size-full", fitClass)}
        />
      ) : null}
    </div>
  );
}
