"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import {
  analisisDermaPiel360CategoryLabel,
  analisisDermaPiel360DiagnosisLabel,
  analisisDermaPiel360RiskLabel,
  type AnalisisDermaPiel360Prediction,
} from "@piel360/shared";
import {
  dermPrediction,
  gaugePercent,
  riskColor,
} from "@/components/analyses/derma-risk";
import { RiskLegend } from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Gender, useBodyModel } from "@/lib/body-model";
import type { Analysis3D } from "@/lib/queries/patients";

const DEFAULT_MARKER_COLOR = "#94a3b8";

type DermAnalysis3D = Analysis3D & {
  prediction: AnalisisDermaPiel360Prediction;
};

function BodyModel({ gender }: { gender: Gender }) {
  return <primitive object={useBodyModel(gender)} />;
}

/** El riesgo del diagnóstico principal, con el color de su nivel. */
function RiskPill({
  prediction,
}: {
  prediction: AnalisisDermaPiel360Prediction;
}) {
  const top = prediction.topn?.[0];
  const color = riskColor(top?.risk_level) ?? DEFAULT_MARKER_COLOR;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm font-medium">
      <span
        aria-hidden
        className="size-3 rounded-full"
        style={{ background: color }}
      />
      Riesgo{" "}
      {analisisDermaPiel360RiskLabel(
        prediction.risk ?? top?.risk,
        top?.risk_level,
      ).toLowerCase()}
    </span>
  );
}

/** Historial 3D de los análisis dermatológicos: un marcador por análisis con
 * ubicación, del color de su riesgo (los mismos del resultado del análisis). */
export function PatientBodyHistory({
  analyses,
  initialGender,
}: {
  analyses: Analysis3D[];
  initialGender?: Gender;
}) {
  const [gender, setGender] = useState<Gender>(initialGender ?? "female");
  const [selected, setSelected] = useState<DermAnalysis3D | null>(null);

  // Los estéticos también guardan ubicación, pero no tienen riesgo.
  const dermAnalyses = useMemo(
    () =>
      analyses.flatMap((a) => {
        const prediction = dermPrediction(a.aiRawResponse);
        return prediction ? [{ ...a, prediction }] : [];
      }),
    [analyses],
  );

  const top = selected?.prediction.topn?.[0];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={gender === "female" ? "default" : "outline"}
          size="sm"
          onClick={() => setGender("female")}
        >
          Mujer
        </Button>
        <Button
          type="button"
          variant={gender === "male" ? "default" : "outline"}
          size="sm"
          onClick={() => setGender("male")}
        >
          Hombre
        </Button>
      </div>

      <div className="h-96 w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Canvas camera={{ position: [0, 1.6, 3.2], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <BodyModel key={gender} gender={gender} />
          {dermAnalyses.map((analysis) => (
            <mesh
              key={analysis.id}
              position={[analysis.xCoord, analysis.yCoord, analysis.zCoord]}
              onClick={(event) => {
                event.stopPropagation();
                setSelected(analysis);
              }}
            >
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshBasicMaterial
                color={
                  riskColor(analysis.prediction.topn?.[0]?.risk_level) ??
                  DEFAULT_MARKER_COLOR
                }
              />
            </mesh>
          ))}
          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={5}
            target={[0, 1.2, 0]}
          />
        </Canvas>
      </div>

      <RiskLegend />

      <p className="text-sm text-muted-foreground">
        {dermAnalyses.length > 0
          ? `${dermAnalyses.length} análisis dermatológicos con ubicación registrada. Haz click en un marcador para ver el detalle.`
          : "Este paciente no tiene análisis dermatológicos con ubicación registrada todavía."}
      </p>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {/* `finalDiagnosis` lo escribe el médico (ya en español); solo el
                  de la IA necesita traducción. */}
              {selected?.finalDiagnosis ??
                (selected?.aiDiagnosis
                  ? analisisDermaPiel360DiagnosisLabel(selected.aiDiagnosis)
                  : "Análisis")}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <RiskGauge
                percent={gaugePercent(selected.prediction)}
                riskLabel={analisisDermaPiel360RiskLabel(
                  selected.prediction.risk,
                  top?.risk_level,
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <RiskPill prediction={selected.prediction} />
                {top?.desease ? (
                  <span className="text-sm text-muted-foreground">
                    {analisisDermaPiel360CategoryLabel(top.desease)}
                  </span>
                ) : null}
              </div>
              <ImageCarousel
                images={[
                  { label: "Original", url: selected.imageUrl },
                  { label: "Coloreada", url: selected.coloredUrl },
                  { label: "Máscara", url: selected.maskedUrl },
                  ...selected.masks.map((m) => ({ label: m.type, url: m.url })),
                ]}
              />
              <p className="text-sm text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
