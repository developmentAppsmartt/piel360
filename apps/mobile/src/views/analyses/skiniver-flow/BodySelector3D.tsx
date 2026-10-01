import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { OrbitControls, useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import {
  BODY_PARTS_INFO,
  BODY_SELECTOR_ORBIT,
  cameraForBodyPoint,
  inferBodyPartFromPoint,
  normalizeMeshName,
  type BodySelection,
} from '../../../data/bodyRegions';
import { normalizeModel, placeSavedPoint } from './bodyModelPlacement';

const femaleModule = require('../../../../assets/models/female/realistic_female_character_new.glb');
const maleModule = require('../../../../assets/models/male/realistic_male_character_new.glb');

type Gender = 'female' | 'male';

type BodySelector3DProps = {
  initialGender?: Gender;
  /** Si true, no muestra el selector Mujer/Hombre (género del paciente). */
  lockGender?: boolean;
  onSelect?: (selection: BodySelection) => void;
  primaryColor?: string;
  /** Vista de solo lectura: marca el punto y enfoca la cámara ahí. */
  focusPoint?: [number, number, number] | null;
  focusRegion?: string | null;
};

function BodyModel({
  uri,
  onSelect,
  anchorPoint,
  onAnchored,
}: {
  uri: string;
  onSelect?: (region: string, point: THREE.Vector3) => void;
  anchorPoint?: [number, number, number] | null;
  onAnchored?: (point: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(uri);

  useEffect(() => {
    normalizeModel(scene);
    if (!anchorPoint || !onAnchored) return;
    const snapped = placeSavedPoint(scene, new THREE.Vector3(...anchorPoint));
    onAnchored([snapped.x, snapped.y, snapped.z]);
  }, [scene, anchorPoint, onAnchored]);

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
  // Solo re-enfocar cuando cambian las coords (no por nueva referencia del array).
  const focusKey = `${point[0].toFixed(4)}|${point[1].toFixed(4)}|${point[2].toFixed(4)}`;

  useEffect(() => {
    const view = cameraForBodyPoint(point);
    camera.position.set(...view.position);
    camera.lookAt(point[0], point[1], point[2]);
    camera.updateProjectionMatrix();
    // point se lee fresco; focusKey evita resets al hacer zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar coords
  }, [camera, focusKey]);

  return null;
}

/**
 * Modelo 3D real (mismos GLB que el CRM) vía expo-gl + R3F native.
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
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marker, setMarker] = useState<[number, number, number] | null>(null);
  const [anchoredPoint, setAnchoredPoint] = useState<
    [number, number, number] | null
  >(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  useEffect(() => {
    setGender(initialGender);
  }, [initialGender]);

  useEffect(() => {
    let cancelled = false;
    setModelUri(null);
    setLoadError(null);
    setMarker(focusPoint);
    setAnchoredPoint(null);
    setRegionId(focusRegion);

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
  }, [gender, focusPoint, focusRegion]);

  const regionInfo = useMemo(
    () => (regionId ? BODY_PARTS_INFO[regionId] : null),
    [regionId],
  );

  const handleAnchored = useCallback((point: [number, number, number]) => {
    setAnchoredPoint(point);
    setMarker(point);
  }, []);

  function handleSelect(region: string, point: THREE.Vector3) {
    setMarker([point.x, point.y, point.z]);
    setRegionId(region);
    onSelect?.({
      bodyRegion: region,
      xCoord: point.x,
      yCoord: point.y,
      zCoord: point.z,
    });
  }

  const cameraFocus = anchoredPoint ?? focusPoint;
  const cameraView = useMemo(() => {
    if (cameraFocus) return cameraForBodyPoint(cameraFocus);
    return {
      position: [0, 1.6, 3.2] as [number, number, number],
      target: [0, 1.2, 0] as [number, number, number],
    };
  }, [
    cameraFocus?.[0],
    cameraFocus?.[1],
    cameraFocus?.[2],
  ]);
  const readOnly = Boolean(focusPoint);

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
            camera={{ position: cameraView.position, fov: 40 }}
            gl={{ antialias: true }}
            onCreated={({ gl }) => {
              const renderer = gl as unknown as { setClearColor?: (c: string) => void };
              renderer.setClearColor?.('#0f1419');
            }}
          >
            <ambientLight intensity={0.75} />
            <directionalLight position={[2, 3, 4]} intensity={1.1} />
            <Suspense fallback={null}>
              <BodyModel
                key={modelUri}
                uri={modelUri}
                onSelect={readOnly ? undefined : handleSelect}
                anchorPoint={readOnly ? focusPoint : null}
                onAnchored={readOnly ? handleAnchored : undefined}
              />
            </Suspense>
            {cameraFocus ? <FocusCamera point={cameraFocus} /> : null}
            {marker ? (
              <mesh position={marker}>
                <sphereGeometry args={[0.028, 16, 16]} />
                <meshBasicMaterial color={primaryColor} />
              </mesh>
            ) : null}
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom
              zoomSpeed={BODY_SELECTOR_ORBIT.zoomSpeed}
              minDistance={BODY_SELECTOR_ORBIT.minDistance}
              maxDistance={BODY_SELECTOR_ORBIT.maxDistance}
              target={cameraView.target}
            />
          </Canvas>
        )}
      </View>

      {regionInfo ? (
        <Text style={styles.selected}>
          {readOnly ? 'Zona seleccionada' : 'Zona'}: {regionInfo.label}
          {readOnly ? '' : ` — ${regionInfo.description}`}
        </Text>
      ) : (
        <Text style={styles.hint}>
          {readOnly
            ? 'Ubicación registrada en la figura'
            : 'Gira el modelo y toca la zona a analizar'}
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
