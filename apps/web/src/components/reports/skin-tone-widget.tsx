"use client";

import type { SkiniverSkinToneBucket } from "@piel360/shared";
import { SegmentDistributionDonut } from "@/components/reports/segment-distribution-donut";

/**
 * Widget 14 del mockup: barras + donut de distribución por tono de piel
 * (fototipo Fitzpatrick, agrupado en 3 rangos reales — ver
 * packages/shared/src/skiniver-diagnosis-taxonomy.ts). El donut reusa
 * SegmentDistributionDonut (ya genérico por {value,label,color,patients,pct}),
 * mapeando `count` → `patients` ya que ese componente no le da otro uso.
 */
export function SkinToneWidget({
  buckets,
  total,
}: {
  buckets: SkiniverSkinToneBucket[];
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay análisis con fototipo registrado en el periodo seleccionado.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{bucket.label}</span>
              <span className="font-semibold tabular-nums">{bucket.count}</span>
            </div>
            <span className="block h-2.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, bucket.pct))}%`,
                  backgroundColor: bucket.color,
                }}
              />
            </span>
          </div>
        ))}
      </div>

      <SegmentDistributionDonut
        buckets={buckets.map((b) => ({
          value: b.key,
          label: b.label,
          color: b.color,
          patients: b.count,
          analyses: b.count,
          avgScore: null,
          pct: b.pct,
        }))}
        total={total}
        centerLabel="Análisis"
      />
    </div>
  );
}
