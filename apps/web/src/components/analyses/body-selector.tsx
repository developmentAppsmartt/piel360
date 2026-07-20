"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { BODY_PARTS_INFO, inferBodyPartFromPoint, normalizeMeshName } from "@/lib/body-regions";

const MODEL_PATHS = {
  female: "/models/female/realistic_female_character_new.glb",
  male: "/models/male/realistic_male_character_new.glb",
} as const;

type Gender = keyof typeof MODEL_PATHS;

// Port de human-body-selector.js: escala a 1.8 de alto, centrado, +1.05 en Y
// — los umbrales de inferBodyPartFromPoint asumen exactamente esta normalización.
function normalizeModel(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.name = normalizeMeshName(child.name);
    }
  });

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.8 / size.y;
  scene.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(scene);
  const center = scaledBox.getCenter(new THREE.Vector3());
  scene.position.sub(center);
  scene.position.y += 1.05;
}

function BodyModel({
  gender,
  onSelect,
}: {
  gender: Gender;
  onSelect: (region: string, point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(MODEL_PATHS[gender]);

  useEffect(() => {
    normalizeModel(scene);
  }, [scene]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const meshName = normalizeMeshName(event.object.name);
    const region = BODY_PARTS_INFO[meshName] ? meshName : inferBodyPartFromPoint(event.point);
    onSelect(region, event.point);
  }

  return <primitive object={scene} onClick={handleClick} />;
}

export function BodySelector({
  onSelect,
}: {
  onSelect: (selection: { bodyRegion: string; xCoord: number; yCoord: number; zCoord: number }) => void;
}) {
  const [gender, setGender] = useState<Gender>("female");
  const [marker, setMarker] = useState<THREE.Vector3 | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  const regionInfo = useMemo(() => (regionId ? BODY_PARTS_INFO[regionId] : null), [regionId]);

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker(point);
    setRegionId(region);
    onSelect({ bodyRegion: region, xCoord: point.x, yCoord: point.y, zCoord: point.z });
  }

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
              <meshBasicMaterial color="#6c4ee3" />
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
    </div>
  );
}
