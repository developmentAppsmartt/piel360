"use client";

import type { FitzpatrickResult, FitzpatrickScale } from "@piel360/shared";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { ModuleCard } from "@/components/ui/module-card";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import { cn } from "@/lib/utils";

function isFitzpatrickScale(value: string): value is FitzpatrickScale {
  return value in FITZPATRICK_TYPES;
}

/** Escala desde el análisis de fototipo propio o, si no hay, desde el perfil
 * del paciente (mismo criterio que la versión mobile) — permite mostrar un
 * chip "Fototipo" dentro del visor de un análisis YouCam sin que exista un
 * análisis Fitzpatrick separado. */
export function resolveFitzpatrickScale(
  analysis: AnalysisDetail,
): FitzpatrickScale | null {
  const fromAnalysis = (analysis.aiRawResponse as FitzpatrickResult | null)
    ?.fitzpatrick_scale;
  if (fromAnalysis && isFitzpatrickScale(fromAnalysis)) return fromAnalysis;

  const fromPatient = analysis.patient?.fitzpatrickType?.trim();
  if (fromPatient && isFitzpatrickScale(fromPatient)) return fromPatient;

  return null;
}

export function FitzpatrickResultsSection({
  analysis,
  compact = false,
  silentIfEmpty = false,
}: {
  analysis: AnalysisDetail;
  /** Variante más chica para incrustar dentro de otro visor (ej. YouCam). */
  compact?: boolean;
  /** Si no hay fototipo, no muestra el mensaje de error — útil cuando el chip
   * ya se oculta cuando no hay dato. */
  silentIfEmpty?: boolean;
}) {
  const scale = resolveFitzpatrickScale(analysis);
  const info = scale ? FITZPATRICK_TYPES[scale] : null;

  if (!info || !scale) {
    if (silentIfEmpty) return null;
    return (
      <p className="text-muted-foreground">
        No se pudo determinar el fototipo de piel para este análisis.
      </p>
    );
  }

  // Como en la app. En la variante compacta no: el visor estético que la
  // incrusta ya muestra la foto.
  const showPhoto = !compact && analysis.hasOriginalPhoto && !!analysis.imageUrl;

  const card = (
    <ModuleCard
      className={cn(
        "space-y-4 text-center",
        compact ? "space-y-2 p-4" : "p-6",
      )}
    >
      <p className="text-sm text-muted-foreground">Resultado</p>
      <div
        className={cn(
          "mx-auto rounded-full border-4 border-card shadow",
          compact ? "size-16" : "size-24",
        )}
        style={{ backgroundColor: info.colorHex }}
      />
      <div>
        <p className={cn("font-bold", compact ? "text-base" : "text-xl")}>
          Tipo {scale}
        </p>
        <p className={cn("text-muted-foreground", compact ? "text-sm" : "text-base")}>
          {info.label}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{info.reaction}</p>
    </ModuleCard>
  );

  if (!showPhoto) return card;

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl border-2 border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
        <img
          src={analysis.imageUrl!}
          alt="Foto del análisis"
          className="size-full object-cover"
        />
        <ImageWatermark />
      </div>
      {card}
    </div>
  );
}
