"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import type { RiskLevel, SkiniverPrediction } from "@piel360/shared";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Gender, MODEL_PATHS, normalizeModel } from "@/lib/body-model";
import type { Analysis3D } from "@/lib/queries/patients";

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#facc15",
  high: "#ef4444",
};
const DEFAULT_MARKER_COLOR = "#94a3b8";

function riskLevel(analysis: Analysis3D): RiskLevel | null {
  const prediction = analysis.aiRawResponse as SkiniverPrediction | null;
  return prediction?.topn?.[0]?.risk_level ?? null;
}

function markerColor(analysis: Analysis3D): string {
  const level = riskLevel(analysis);
  return level ? RISK_COLORS[level] : DEFAULT_MARKER_COLOR;
}

function BodyModel({ gender }: { gender: Gender }) {
  const { scene } = useGLTF(MODEL_PATHS[gender]);

  useEffect(() => {
    normalizeModel(scene);
  }, [scene]);

  return <primitive object={scene} />;
}

export function PatientBodyHistory({
  analyses,
  initialGender,
}: {
  analyses: Analysis3D[];
  initialGender?: Gender;
}) {
  const [gender, setGender] = useState<Gender>(initialGender ?? "female");
  const [selected, setSelected] = useState<Analysis3D | null>(null);

  const selectedPrediction = selected?.aiRawResponse as SkiniverPrediction | null | undefined;

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
          {analyses.map((analysis) => (
            <mesh
              key={analysis.id}
              position={[analysis.xCoord, analysis.yCoord, analysis.zCoord]}
              onClick={(event) => {
                event.stopPropagation();
                setSelected(analysis);
              }}
            >
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshBasicMaterial color={markerColor(analysis)} />
            </mesh>
          ))}
          <OrbitControls enablePan={false} minDistance={1} maxDistance={5} target={[0, 1.2, 0]} />
        </Canvas>
      </div>

      <p className="text-sm text-muted-foreground">
        {analyses.length > 0
          ? `${analyses.length} análisis con ubicación registrada. Haz click en un marcador para ver el detalle.`
          : "Este paciente no tiene análisis con ubicación registrada todavía."}
      </p>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.finalDiagnosis ?? selected?.aiDiagnosis ?? "Análisis"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <ImageCarousel
                images={[
                  { label: "Original", url: selected.imageUrl },
                  { label: "Coloreada", url: selected.coloredUrl },
                  { label: "Máscara", url: selected.maskedUrl },
                  ...selected.masks.map((m) => ({ label: m.type, url: m.url })),
                ]}
              />
              <p className="text-sm">
                Riesgo: <span className="font-medium">{selectedPrediction?.risk ?? "—"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
