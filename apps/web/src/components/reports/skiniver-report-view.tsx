"use client";

import {
  SKINIVER_AGE_BUCKETS,
  SKINIVER_DIAGNOSIS_CLASS_DEFS,
  SKINIVER_DISEASE_BUCKET_DEFS,
  type SkiniverReport,
} from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import { MultiSeriesTrendChart } from "@/components/reports/multi-series-trend-chart";
import { SkinToneWidget } from "@/components/reports/skin-tone-widget";
import { SkiniverClinicoWidget } from "@/components/reports/skiniver-clinico-widget";

const CLASS_SERIES = Object.entries(SKINIVER_DIAGNOSIS_CLASS_DEFS).map(([key, def]) => ({
  key,
  label: def.label,
  color: def.color,
}));

const DISEASE_SERIES = Object.entries(SKINIVER_DISEASE_BUCKET_DEFS).map(([key, def]) => ({
  key,
  label: def.label,
  color: def.color,
}));

const AGE_SERIES = SKINIVER_AGE_BUCKETS.map((b) => ({
  key: b.key,
  label: b.label,
  color: b.color,
}));

export function SkiniverReportView({ report }: { report: SkiniverReport }) {
  return (
    <div className="space-y-5">
      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          Clínico: análisis imágenes dermatológica
        </ModuleCardTitle>
        <ModuleCardDescription>
          Este análisis es asistido por IA y no reemplaza el criterio clínico del
          profesional.
        </ModuleCardDescription>
        <div className="mt-4">
          <SkiniverClinicoWidget />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por clase por mes
        </ModuleCardTitle>
        <ModuleCardDescription>
          La clasificación de clases es una agrupación propia sobre el catálogo de
          diagnósticos de la IA.
        </ModuleCardDescription>
        <div className="mt-4">
          <MultiSeriesTrendChart points={report.byClass} series={CLASS_SERIES} />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por enfermedad por mes
        </ModuleCardTitle>
        <ModuleCardDescription>
          Las enfermedades son agrupadas a partir del diagnóstico devuelto por la IA.
        </ModuleCardDescription>
        <div className="mt-4">
          <MultiSeriesTrendChart points={report.byDisease} series={DISEASE_SERIES} />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por edades x mes
        </ModuleCardTitle>
        <ModuleCardDescription>
          Los diagnósticos por edad son calculados con la fecha de nacimiento del
          paciente al momento del análisis.
        </ModuleCardDescription>
        <div className="mt-4">
          <MultiSeriesTrendChart points={report.byAge} series={AGE_SERIES} />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por tonos de piel
        </ModuleCardTitle>
        <ModuleCardDescription>
          La clasificación de tonos de piel se basa en la escala Fitzpatrick.
        </ModuleCardDescription>
        <div className="mt-4">
          <SkinToneWidget buckets={report.bySkinTone} total={report.skinToneTotal} />
        </div>
      </ModuleCard>
    </div>
  );
}
