"use client";

/** Combina varias máscaras crudas (.png con transparencia, YouCam con
 * enableMaskOverlay:false) apiladas al mismo tiempo sobre la foto original —
 * a diferencia de `ImageCarousel`, que muestra una máscara a la vez, acá se
 * ven todas las capas juntas (pedido del cliente para un subconjunto fijo de
 * métricas: ojeras, firmeza, oleosidad, enrojecimiento, bolsas, surco
 * lagrimal, poros y arrugas). */
export function MaskLayersOverlay({
  backgroundUrl,
  layers,
}: {
  backgroundUrl: string;
  layers: { label: string; url: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
        <img src={backgroundUrl} alt="Foto original" className="h-auto w-full" />
        {layers.map((layer) => (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image
          <img
            key={layer.label}
            src={layer.url}
            alt={layer.label}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Vista combinada: {layers.map((l) => l.label).join(", ")}
      </p>
    </div>
  );
}
