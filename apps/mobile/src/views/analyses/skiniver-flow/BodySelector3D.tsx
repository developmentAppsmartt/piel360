import { useEffect, useMemo, useState, Suspense } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Canvas, type ThreeEvent } from '@react-three/fiber/native';
import { OrbitControls, useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
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
  /** Si true, no muestra el selector Mujer/Hombre (género del paciente). */
  lockGender?: boolean;
  onSelect: (selection: BodySelection) => void;
  primaryColor?: string;
};

function normalizeModel(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.name = normalizeMeshName(child.name);
      // Evita problemas de culling en expo-gl
      child.frustumCulled = false;
    }
  });

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  scene.scale.setScalar(1.8 / Math.max(size.y, 0.001));

  const scaledBox = new THREE.Box3().setFromObject(scene);
  const center = scaledBox.getCenter(new THREE.Vector3());
  scene.position.sub(center);
  scene.position.y += 1.05;
}

function BodyModel({
  uri,
  onSelect,
}: {
  uri: string;
  onSelect: (region: string, point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(uri);

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
 * Modelo 3D real (mismos GLB que el CRM) vía expo-gl + R3F native.
 */
export function BodySelector3D({
  initialGender = 'female',
  lockGender = false,
  onSelect,
  primaryColor = '#1e5a9e',
}: BodySelector3DProps) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marker, setMarker] = useState<[number, number, number] | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  useEffect(() => {
    setGender(initialGender);
  }, [initialGender]);

  useEffect(() => {
    let cancelled = false;
    setModelUri(null);
    setLoadError(null);
    setMarker(null);
    setRegionId(null);

    (async () => {
      try {
        const module = gender === 'female' ? femaleModule : maleModule;
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('No se pudo resolver el GLB');
        if (!cancelled) setModelUri(uri);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Error cargando el modelo 3D',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gender]);

  const regionInfo = useMemo(
    () => (regionId ? BODY_PARTS_INFO[regionId] : null),
    [regionId],
  );

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker([point.x, point.y, point.z]);
    setRegionId(region);
    onSelect({
      bodyRegion: region,
      xCoord: point.x,
      yCoord: point.y,
      zCoord: point.z,
    });
  }

  return (
    <View style={styles.wrap}>
      {!lockGender ? (
        <View style={styles.genderRow}>
          {(['female', 'male'] as const).map((g) => {
            const active = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={[
                  styles.genderBtn,
                  active && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
              >
                <Text style={[styles.genderText, active && { color: '#fff' }]}>
                  {g === 'female' ? 'Mujer' : 'Hombre'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.lockedGender}>
          Modelo: {gender === 'female' ? 'Mujer' : 'Hombre'}
        </Text>
      )}

      <View style={styles.canvas}>
        {loadError ? (
          <Text style={styles.error}>{loadError}</Text>
        ) : !modelUri ? (
          <ActivityIndicator color={primaryColor} />
        ) : (
          <Canvas
            style={StyleSheet.absoluteFill}
            camera={{ position: [0, 1.6, 3.2], fov: 40 }}
            gl={{ antialias: true }}
            onCreated={({ gl }) => {
              const renderer = gl as unknown as { setClearColor?: (c: string) => void };
              renderer.setClearColor?.('#0f1419');
            }}
          >
            <ambientLight intensity={0.75} />
            <directionalLight position={[2, 3, 4]} intensity={1.1} />
            <Suspense fallback={null}>
              <BodyModel key={modelUri} uri={modelUri} onSelect={handleSelect} />
            </Suspense>
            {marker ? (
              <mesh position={marker}>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshBasicMaterial color={primaryColor} />
              </mesh>
            ) : null}
            <OrbitControls
              enablePan={false}
              minDistance={1.2}
              maxDistance={5}
              target={[0, 1.2, 0]}
            />
          </Canvas>
        )}
      </View>

      {regionInfo ? (
        <Text style={styles.selected}>
          Zona: {regionInfo.label} — {regionInfo.description}
        </Text>
      ) : (
        <Text style={styles.hint}>
          Gira el modelo y toca la zona a analizar
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexShrink: 0 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  genderText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  lockedGender: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    flexShrink: 0,
  },
  canvas: {
    flex: 1,
    minHeight: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f1419',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#fecaca', padding: 16, textAlign: 'center' },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    flexShrink: 0,
  },
  selected: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    flexShrink: 0,
  },
});
