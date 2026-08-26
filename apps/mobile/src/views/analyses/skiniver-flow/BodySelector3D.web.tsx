import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import {
  BODY_PARTS_INFO,
  inferBodyPartFromPoint,
  normalizeMeshName,
  type BodySelection,
} from '../../../data/bodyRegions';

const femaleModule = require('../../../../assets/models/female/realistic_female_character_new.glb');
const maleModule = require('../../../../assets/models/male/realistic_male_character_new.glb');

type Gender = 'female' | 'male';

type BodySelector3DProps = {
  initialGender?: Gender;
  onSelect: (selection: BodySelection) => void;
  primaryColor?: string;
};

function modelUrl(moduleId: number): string {
  return Asset.fromModule(moduleId).uri;
}

function normalizeModel(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.name = normalizeMeshName(child.name);
    }
  });

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  scene.scale.setScalar(1.8 / size.y);

  const scaledBox = new THREE.Box3().setFromObject(scene);
  const center = scaledBox.getCenter(new THREE.Vector3());
  scene.position.sub(center);
  scene.position.y += 1.05;
}

function BodyModel({
  url,
  onSelect,
}: {
  url: string;
  onSelect: (region: string, point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    normalizeModel(scene);
  }, [scene]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const meshName = normalizeMeshName(event.object.name);
    const region = BODY_PARTS_INFO[meshName]
      ? meshName
      : inferBodyPartFromPoint(event.point);
    onSelect(region, event.point);
  }

  return <primitive object={scene} onClick={handleClick} />;
}

/**
 * Mismo stack que el CRM web: @react-three/fiber + GLB.
 * Metro usa este archivo solo en plataforma web.
 */
export function BodySelector3D({
  initialGender = 'female',
  onSelect,
  primaryColor = '#6c4ee3',
}: BodySelector3DProps) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [marker, setMarker] = useState<THREE.Vector3 | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  const url = useMemo(
    () => modelUrl(gender === 'female' ? femaleModule : maleModule),
    [gender],
  );

  const regionInfo = useMemo(
    () => (regionId ? BODY_PARTS_INFO[regionId] : null),
    [regionId],
  );

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker(point.clone());
    setRegionId(region);
    onSelect({
      bodyRegion: region,
      xCoord: point.x,
      yCoord: point.y,
      zCoord: point.z,
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 360 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['female', 'male'] as const).map((g) => {
          const active = gender === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGender(g);
                setMarker(null);
                setRegionId(null);
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: `1px solid ${active ? primaryColor : '#cbd5e1'}`,
                background: active ? primaryColor : '#fff',
                color: active ? '#fff' : '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {g === 'female' ? 'Mujer' : 'Hombre'}
            </button>
          );
        })}
      </div>

      <div
        style={{
          height: 360,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0f1419',
        }}
      >
        <Canvas camera={{ position: [0, 1.6, 3.2], fov: 40 }}>
          <color attach="background" args={['#0f1419']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <BodyModel key={url} url={url} onSelect={handleSelect} />
          {marker ? (
            <mesh position={marker}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color={primaryColor} />
            </mesh>
          ) : null}
          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={5}
            target={[0, 1.2, 0]}
          />
        </Canvas>
      </div>

      <p
        style={{
          marginTop: 10,
          fontSize: 13,
          textAlign: 'center',
          color: regionInfo ? '#0f172a' : '#64748b',
          fontWeight: regionInfo ? 600 : 400,
        }}
      >
        {regionInfo
          ? `Zona: ${regionInfo.label} — ${regionInfo.description}`
          : 'Gira el modelo y haz click en la zona a analizar'}
      </p>
    </div>
  );
}

useGLTF.preload(modelUrl(femaleModule));
useGLTF.preload(modelUrl(maleModule));
