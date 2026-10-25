"use client";

import {
  ANALISIS_DERMA_PIEL360_AGE_BUCKETS,
  type AnalisisDermaPiel360Report,
} from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import { AgeDistributionBars } from "@/components/reports/age-distribution-bars";
import { AgeGenderBars } from "@/components/reports/age-gender-bars";
import { DiagnosisCategoryDonut } from "@/components/reports/diagnosis-category-donut";
import { MultiSeriesTrendChart } from "@/components/reports/multi-series-trend-chart";
import { SkinToneWidget } from "@/components/reports/skin-tone-widget";
import { AnalisisDermaPiel360ClinicoWidget } from "@/components/reports/skiniver-clinico-widget";
import { TopDiagnosesTable } from "@/components/reports/top-diagnoses-table";

// Las series de clase y de enfermedad no son constantes: dependen de qué se
// diagnosticó en el periodo, así que llegan en el reporte.

const AGE_SERIES = ANALISIS_DERMA_PIEL360_AGE_BUCKETS.map((b) => ({
  key: b.key,
  label: b.label,
  color: b.color,
}));

/**
 * Reporte de análisis dermatológicos. Se usa igual en el panel del doctor
 * (acotado a sus pacientes) y en el de admin (toda la plataforma): el alcance
 * lo resuelve el endpoint, no esta vista.
 *
 * `showClinicalBrowser` apaga el buscador de análisis, que carga el listado
 * completo para filtrar en cliente — innecesario en una vista global.
 */
export function AnalisisDermaPiel360ReportView({
  report,
  showClinicalBrowser = true,
}: {
  report: AnalisisDermaPiel360Report;
  showClinicalBrowser?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Enfermedades de la piel por Clases
          </ModuleCardTitle>
          <ModuleCardDescription>
            Distribución de diagnósticos por clase (grupo de patologías), según
            la clasificación que devuelve la IA.
          </ModuleCardDescription>
          <div className="mt-4">
            <DiagnosisCategoryDonut
              slices={report.byCategory}
              total={report.total}
            />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Top 10 de diagnósticos más recurrentes
          </ModuleCardTitle>
          <ModuleCardDescription>
            Diagnósticos con mayor frecuencia en tus pacientes.
          </ModuleCardDescription>
          <div className="mt-4">
            <TopDiagnosesTable rows={report.topDiagnoses} />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Enfermedades por edad y sexo
          </ModuleCardTitle>
          <ModuleCardDescription>
            Diagnósticos según rango de edad y género del paciente.
          </ModuleCardDescription>
          <div className="mt-4">
            <AgeGenderBars rows={report.byAgeGender} />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Distribución de diagnósticos por edad
          </ModuleCardTitle>
          <ModuleCardDescription>
            Frecuencia de diagnósticos según rangos de edad.
          </ModuleCardDescription>
          <div className="mt-4">
            <AgeDistributionBars slices={report.ageDistribution} />
          </div>
        </ModuleCard>
      </div>

      {showClinicalBrowser ? (
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Clínico: análisis imágenes dermatológica
          </ModuleCardTitle>
          <ModuleCardDescription>
            Este análisis es asistido por IA y no reemplaza el criterio clínico del
            profesional.
          </ModuleCardDescription>
          <div className="mt-4">
            <AnalisisDermaPiel360ClinicoWidget range={report.range} />
          </div>
        </ModuleCard>
      ) : null}

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por clase por mes
        </ModuleCardTitle>
        <ModuleCardDescription>
          Las clases son los grupos de patologías que devuelve la IA: las 8 más
          frecuentes del periodo; el resto se agrupa en «Otras».
        </ModuleCardDescription>
        <div className="mt-4">
          <MultiSeriesTrendChart points={report.byClass} series={report.classSeries} />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          No. de diagnósticos por enfermedad por mes
        </ModuleCardTitle>
        <ModuleCardDescription>
          Condiciones concretas diagnosticadas por la IA: las 8 más frecuentes del
          periodo; el resto se agrupa en «Otras».
        </ModuleCardDescription>
        <div className="mt-4">
          <MultiSeriesTrendChart
            points={report.byDisease}
            series={report.diseaseSeries}
          />
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
