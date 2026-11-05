"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
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
import { BodyGenderToggle } from "@/components/analyses/body-gender-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_BODY_GENDER, type Gender, useBodyModel } from "@/lib/body-model";
import { placeSavedPoint } from "@/lib/body-placement";
import { inferBodyPartFromPoint } from "@/lib/body-regions";
import type { Analysis3D } from "@/lib/queries/patients";

const DEFAULT_MARKER_COLOR = "#94a3b8";

type DermAnalysis3D = Analysis3D & {
  prediction: AnalisisDermaPiel360Prediction;
};

/** La figura y sus marcadores: los puntos se colocan sobre la piel de esta
 * figura (ver `placeSavedPoint`), así que van en el mismo componente. */
function BodyWithMarkers({
  gender,
  analyses,
  onSelect,
}: {
  gender: Gender;
  analyses: DermAnalysis3D[];
  onSelect: (analysis: DermAnalysis3D) => void;
}) {
  const model = useBodyModel(gender);
  const markers = useMemo(
    () =>
      analyses.map((analysis) => ({
        analysis,
        position: placeSavedPoint(
          model,
          new THREE.Vector3(analysis.xCoord, analysis.yCoord, analysis.zCoord),
          analysis.bodyRegion
            ? (point) => inferBodyPartFromPoint(point) === analysis.bodyRegion
            : undefined,
        ),
      })),
    [model, analyses],
  );

  return (
    <>
      <primitive object={model} />
      {markers.map(({ analysis, position }) => (
        <mesh
          key={analysis.id}
          position={position}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(analysis);
          }}
        >
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshBasicMaterial
            color={riskColor(analysis.prediction.topn?.[0]?.risk_level) ?? DEFAULT_MARKER_COLOR}
          />
        </mesh>
      ))}
    </>
  );
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
  initialGender?: Gender | null;
}) {
  const [gender, setGender] = useState<Gender>(initialGender ?? DEFAULT_BODY_GENDER);
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
      <BodyGenderToggle value={gender} onChange={setGender} />

      <div className="h-96 w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Canvas camera={{ position: [0, 1.6, 3.2], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <BodyWithMarkers
            key={gender}
            gender={gender}
            analyses={dermAnalyses}
            onSelect={setSelected}
          />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
              {/* La foto primero y el medidor compacto: en un portátil el
                  medidor a tamaño completo empujaba los botones del carrusel
                  fuera de la pantalla. */}
              <ImageCarousel
                images={[
                  { label: "Original", url: selected.imageUrl },
                  { label: "Coloreada", url: selected.coloredUrl },
                  { label: "Máscara", url: selected.maskedUrl },
                  ...selected.masks.map((m) => ({ label: m.type, url: m.url })),
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <RiskPill prediction={selected.prediction} />
                {top?.desease ? (
                  <span className="text-sm text-muted-foreground">
                    {analisisDermaPiel360CategoryLabel(top.desease)}
                  </span>
                ) : null}
              </div>
              <RiskGauge
                className="max-w-[180px]"
                percent={gaugePercent(selected.prediction)}
                riskLabel={analisisDermaPiel360RiskLabel(
                  selected.prediction.risk,
                  top?.risk_level,
                )}
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
