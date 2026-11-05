"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import type * as THREE from "three";
import { BodyGenderToggle } from "@/components/analyses/body-gender-toggle";
import { DEFAULT_BODY_GENDER, type Gender, useBodyModel } from "@/lib/body-model";
import { BODY_PARTS_INFO, inferBodyPartFromPoint, normalizeMeshName } from "@/lib/body-regions";

function BodyModel({
  gender,
  onSelect,
}: {
  gender: Gender;
  onSelect: (region: string, point: THREE.Vector3) => void;
}) {
  const model = useBodyModel(gender);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const meshName = normalizeMeshName(event.object.name);
    const region = BODY_PARTS_INFO[meshName] ? meshName : inferBodyPartFromPoint(event.point);
    onSelect(region, event.point);
  }

  return <primitive object={model} onClick={handleClick} />;
}

export function BodySelector({
  onSelect,
  patientGender,
}: {
  onSelect: (
    selection: { bodyRegion: string; xCoord: number; yCoord: number; zCoord: number } | null,
  ) => void;
  /** Con el género del paciente conocido la figura queda fija, como en el
   * móvil: abrir siempre la de mujer dejaba puntos de hombres sobre la figura
   * equivocada, y en el historial se veían fuera del brazo. */
  patientGender?: Gender | null;
}) {
  const [chosenGender, setChosenGender] = useState<Gender>(DEFAULT_BODY_GENDER);
  // Derivado: el paciente puede cargar después del primer render.
  const gender = patientGender ?? chosenGender;
  const [marker, setMarker] = useState<THREE.Vector3 | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  const regionInfo = useMemo(() => (regionId ? BODY_PARTS_INFO[regionId] : null), [regionId]);

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker(point);
    setRegionId(region);
    onSelect({ bodyRegion: region, xCoord: point.x, yCoord: point.y, zCoord: point.z });
  }

  // Un punto marcado en una figura no vale en la otra: se borra al cambiar.
  function changeGender(next: Gender) {
    setChosenGender(next);
    setMarker(null);
    setRegionId(null);
    onSelect(null);
  }

  return (
    <div className="space-y-3">
      <BodyGenderToggle value={gender} onChange={changeGender} locked={!!patientGender} />

      <div className="h-96 w-full overflow-hidden rounded-lg border border-border bg-muted">
        {/* Cámara/target portados literalmente de human-body-selector.js:88-133
            — sin esto, OrbitControls apunta a (0,0,0) en vez de la altura del
            torso/rostro y el modelo queda desfasado hacia abajo en el frame. */}
        <Canvas camera={{ position: [0, 1.6, 3.2], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <BodyModel key={gender} gender={gender} onSelect={handleSelect} />
          {marker && (
            <mesh position={marker}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#1e5a9e" />
            </mesh>
          )}
          <OrbitControls enablePan={false} minDistance={1} maxDistance={5} target={[0, 1.2, 0]} />
        </Canvas>
      </div>

      <p className="text-sm text-muted-foreground">
        {regionInfo
          ? `Región seleccionada: ${regionInfo.label} — ${regionInfo.description}`
          : "Haz click sobre el modelo para marcar la región de la lesión (opcional)."}
      </p>
      {marker && (
        <p className="font-mono text-xs text-muted-foreground">
          X: {marker.x.toFixed(3)} · Y: {marker.y.toFixed(3)} · Z: {marker.z.toFixed(3)}
        </p>
      )}
    </div>
  );
}
