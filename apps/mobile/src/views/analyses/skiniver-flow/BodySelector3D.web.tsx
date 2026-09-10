import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import {
  BODY_PARTS_INFO,
  cameraForBodyPoint,
  inferBodyPartFromPoint,
  normalizeMeshName,
  type BodySelection,
} from '../../../data/bodyRegions';

const femaleModule = require('../../../../assets/models/female/realistic_female_character_new.glb');
const maleModule = require('../../../../assets/models/male/realistic_male_character_new.glb');

type Gender = 'female' | 'male';

type BodySelector3DProps = {
  initialGender?: Gender;
  lockGender?: boolean;
  onSelect?: (selection: BodySelection) => void;
  primaryColor?: string;
  focusPoint?: [number, number, number] | null;
  focusRegion?: string | null;
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
  onSelect?: (region: string, point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    normalizeModel(scene);
  }, [scene]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!onSelect) return;
    event.stopPropagation();
    const meshName = normalizeMeshName(event.object.name);
    const region = BODY_PARTS_INFO[meshName]
      ? meshName
      : inferBodyPartFromPoint(event.point);
    onSelect(region, event.point);
  }

  return <primitive object={scene} onClick={onSelect ? handleClick : undefined} />;
}

function FocusCamera({ point }: { point: [number, number, number] }) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const view = cameraForBodyPoint(point);
    camera.position.set(...view.position);
    camera.lookAt(point[0], point[1], point[2]);
    camera.updateProjectionMatrix();
  }, [camera, point]);

  return null;
}

/**
 * Mismo stack que el CRM web: @react-three/fiber + GLB.
 * Metro usa este archivo solo en plataforma web.
 */
export function BodySelector3D({
  initialGender = 'female',
  lockGender = false,
  onSelect,
  primaryColor = '#1e5a9e',
  focusPoint = null,
  focusRegion = null,
}: BodySelector3DProps) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [marker, setMarker] = useState<THREE.Vector3 | null>(
    focusPoint ? new THREE.Vector3(...focusPoint) : null,
  );
  const [regionId, setRegionId] = useState<string | null>(focusRegion);

  useEffect(() => {
    setGender(initialGender);
  }, [initialGender]);

  const url = useMemo(
    () => modelUrl(gender === 'female' ? femaleModule : maleModule),
    [gender],
  );

  const regionInfo = useMemo(
    () => (regionId ? BODY_PARTS_INFO[regionId] : null),
    [regionId],
  );

  useEffect(() => {
    if (!focusPoint) return;
    setMarker(new THREE.Vector3(...focusPoint));
    setRegionId(focusRegion);
  }, [focusPoint, focusRegion]);

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker(point.clone());
    setRegionId(region);
    onSelect?.({
      bodyRegion: region,
      xCoord: point.x,
      yCoord: point.y,
      zCoord: point.z,
    });
  }

  const cameraView = focusPoint
    ? cameraForBodyPoint(focusPoint)
    : { position: [0, 1.6, 3.2] as [number, number, number], target: [0, 1.2, 0] as [number, number, number] };
  const readOnly = Boolean(focusPoint);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 360 }}>
      {!lockGender ? (
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
      ) : (
        <p
          style={{
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          Modelo: {gender === 'female' ? 'Mujer' : 'Hombre'}
        </p>
      )}

      <div
        style={{
          height: 360,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0f1419',
        }}
      >
        <Canvas camera={{ position: cameraView.position, fov: 40 }}>
          <color attach="background" args={['#0f1419']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <BodyModel key={url} url={url} onSelect={readOnly ? undefined : handleSelect} />
          {focusPoint ? <FocusCamera point={focusPoint} /> : null}
          {marker ? (
            <mesh position={marker}>
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshBasicMaterial color={primaryColor} />
            </mesh>
          ) : null}
          <OrbitControls
            enablePan={false}
            minDistance={0.7}
            maxDistance={5}
            target={cameraView.target}
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
          ? `${readOnly ? 'Zona seleccionada' : 'Zona'}: ${regionInfo.label}${readOnly ? '' : ` — ${regionInfo.description}`}`
          : readOnly
            ? 'Ubicación registrada en la figura'
            : 'Gira el modelo y haz click en la zona a analizar'}
      </p>
    </div>
  );
}

useGLTF.preload(modelUrl(femaleModule));
useGLTF.preload(modelUrl(maleModule));
