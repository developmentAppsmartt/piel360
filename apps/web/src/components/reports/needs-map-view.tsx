"use client";

import { useEffect, useState } from "react";
import type { SkinHealthReport } from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import { CategoryDetailPanel } from "@/components/reports/category-detail-panel";
import { CategoryRankingBars } from "@/components/reports/category-ranking-bars";

const NEEDS_COUNT = 10;
const STRENGTHS_COUNT = 5;

export function NeedsMapView({ report }: { report: SkinHealthReport }) {
  // Las categorías vienen ordenadas ascendente: cabeza = peores, cola = mejores.
  const needs = report.categories.slice(0, NEEDS_COUNT);
  const strengths = report.categories.slice(-STRENGTHS_COUNT).reverse();

  const [selectedKey, setSelectedKey] = useState<string | null>(
    needs[0]?.key ?? null,
  );

  // Si cambia el periodo/filtro y la categoría elegida ya no existe, volver a la peor.
  useEffect(() => {
    const exists = report.categories.some((c) => c.key === selectedKey);
    if (!exists) setSelectedKey(report.categories[0]?.key ?? null);
  }, [report.categories, selectedKey]);

  const selected =
    report.categories.find((c) => c.key === selectedKey) ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Necesidades prioritarias
          </ModuleCardTitle>
          <ModuleCardDescription>
            Categorías con menor puntaje promedio: las que requieren mayor atención.
          </ModuleCardDescription>
          <div className="mt-4">
            <CategoryRankingBars
              categories={needs}
              variant="needs"
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">Fortalezas de la piel</ModuleCardTitle>
          <ModuleCardDescription>
            Categorías con mejores puntajes promedio.
          </ModuleCardDescription>
          <div className="mt-4">
            <CategoryRankingBars
              categories={strengths}
              variant="strengths"
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
          </div>
        </ModuleCard>
      </div>

      <CategoryDetailPanel category={selected} />
    </div>
  );
}
