import * as THREE from 'three';
import { normalizeMeshName } from '../../../data/bodyRegions';

/**
 * Escala a 1.8 de alto, centra y sube 1.05 en Y (mismo espacio que el CRM y
 * que `inferBodyPartFromPoint`). Idempotente: useGLTF cachea la escena.
 */
export function normalizeModel(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.name = normalizeMeshName(child.name);
      // Evita problemas de culling en expo-gl
      child.frustumCulled = false;
    }
  });

  scene.scale.setScalar(1);
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const rawCenter = box.getCenter(new THREE.Vector3());
  scene.scale.setScalar(1.8 / Math.max(size.y, 0.001));

  const scaledBox = new THREE.Box3().setFromObject(scene);
  const center = scaledBox.getCenter(new THREE.Vector3());
  scene.position.sub(center);
  scene.position.y += 1.05;
  scene.updateMatrixWorld(true);

  // Puntos guardados con la versión anterior (doble normalización): el modelo
  // quedaba a escala 1, centrado y subido 1.05. Matriz para llevarlos al actual.
  const legacy = new THREE.Matrix4().makeTranslation(
    -rawCenter.x,
    -rawCenter.y + 1.05,
    -rawCenter.z,
  );
  scene.userData.piel360LegacyToCurrent = scene.matrix
    .clone()
    .multiply(legacy.invert());
  scene.userData.piel360Bounds = new THREE.Box3().setFromObject(scene);
}

function legacyPointToCurrent(
  root: THREE.Object3D,
  point: THREE.Vector3,
): THREE.Vector3 | null {
  const matrix = root.userData.piel360LegacyToCurrent as THREE.Matrix4 | undefined;
  return matrix ? point.clone().applyMatrix4(matrix) : null;
}

type SnapResult = { point: THREE.Vector3; distance: number };

/** Acerca el punto guardado a la piel para que el marcador no flote. */
function snapPointToBody(
  root: THREE.Object3D,
  point: THREE.Vector3,
): SnapResult {
  root.updateMatrixWorld(true);
  const meshes: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  if (meshes.length === 0) return { point: point.clone(), distance: Infinity };

  const axis = new THREE.Vector3(0, point.y, 0);
  const outward = point.clone().sub(axis);
  if (outward.lengthSq() < 1e-6) outward.set(0, 0, 1);
  outward.normalize();

  const rays = [
    { origin: point.clone().add(outward.clone().multiplyScalar(0.9)), dir: outward.clone().negate() },
    { origin: point.clone().add(outward.clone().multiplyScalar(-0.15)), dir: outward.clone() },
    { origin: point.clone(), dir: outward.clone().negate() },
    { origin: point.clone(), dir: outward.clone() },
  ];

  const raycaster = new THREE.Raycaster();
  let best: THREE.Intersection | null = null;
  let bestDist = Infinity;
  for (const ray of rays) {
    raycaster.set(ray.origin, ray.dir);
    raycaster.far = 1.4;
    const hits = raycaster.intersectObjects(meshes, false);
    const hit = hits[0];
    if (!hit) continue;
    const dist = hit.point.distanceTo(point);
    if (dist < bestDist) {
      best = hit;
      bestDist = dist;
    }
  }
  if (!best || bestDist > 0.45) return { point: point.clone(), distance: Infinity };

  const placed = best.point.clone();
  const normal = best.face?.normal;
  if (normal) {
    const worldNormal = normal
      .clone()
      .transformDirection(best.object.matrixWorld)
      .normalize();
    placed.add(worldNormal.multiplyScalar(0.012));
  }
  return { point: placed, distance: bestDist };
}

/** El punto de la piel más cercano, buscando en todos los triángulos. Solo
 * para cuando los rayos no encuentran piel cerca: un brazo marcado en la otra
 * figura queda a otra altura y los rayos horizontales pasan de largo. */
function closestSurfacePoint(
  root: THREE.Object3D,
  point: THREE.Vector3,
): SnapResult {
  root.updateMatrixWorld(true);
  const triangle = new THREE.Triangle();
  const candidate = new THREE.Vector3();
  let best: SnapResult = { point: point.clone(), distance: Infinity };
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.attributes.position;
    const index = child.geometry.index;
    const count = index ? index.count : position.count;
    const vertex = (i: number) =>
      new THREE.Vector3()
        .fromBufferAttribute(position, index ? index.getX(i) : i)
        .applyMatrix4(child.matrixWorld);
    for (let i = 0; i < count; i += 3) {
      triangle.set(vertex(i), vertex(i + 1), vertex(i + 2));
      triangle.closestPointToPoint(point, candidate);
      const distance = candidate.distanceTo(point);
      if (distance < best.distance) {
        const normal = triangle.getNormal(new THREE.Vector3());
        best = {
          point: candidate.clone().add(normal.multiplyScalar(0.012)),
          distance,
        };
      }
    }
  });
  return best.distance <= 0.45
    ? best
    : { point: point.clone(), distance: Infinity };
}

/** Rayos primero (baratos); si no encuentran piel cerca, la superficie más cercana. */
function placeOnSkin(root: THREE.Object3D, point: THREE.Vector3): SnapResult {
  const snapped = snapPointToBody(root, point);
  return snapped.distance <= 0.05 ? snapped : closestSurfacePoint(root, point);
}

/**
 * Ubica el punto guardado sobre la figura, corrigiendo coords antiguas.
 * Espejo de `apps/web/src/lib/body-placement.ts`: si cambias uno, cambia el
 * otro.
 *
 * `matchesRegion` decide entre colocarlo tal cual o con la corrección antigua
 * cuando ninguno cae solo en la piel: la corrección mueve el punto ~35 cm y,
 * en un brazo marcado en la otra figura, lo dejaba sobre la piel… pero en el
 * pecho. La región guardada con el análisis dice cuál es el bueno.
 */
export function placeSavedPoint(
  root: THREE.Object3D,
  saved: THREE.Vector3,
  matchesRegion?: (point: THREE.Vector3) => boolean,
): THREE.Vector3 {
  const bounds = root.userData.piel360Bounds as THREE.Box3 | undefined;
  const outside = bounds
    ? !bounds.clone().expandByScalar(0.03).containsPoint(saved)
    : false;
  const quick = snapPointToBody(root, saved);
  if (!outside && quick.distance <= 0.05) return quick.point;

  const direct = placeOnSkin(root, saved);
  const legacyPoint = legacyPointToCurrent(root, saved);
  if (!legacyPoint) return direct.point;
  const legacy = placeOnSkin(root, legacyPoint);

  // De los que caen en su región, el que menos mueve el punto.
  const sameRegion = [direct, legacy]
    .filter((c) => c.distance !== Infinity && matchesRegion?.(c.point))
    .sort((a, b) => a.point.distanceTo(saved) - b.point.distanceTo(saved))[0];
  if (sameRegion) return sameRegion.point;
  // Sin región que lo confirme, el criterio de siempre.
  if (!matchesRegion || direct.distance === Infinity) {
    if (outside && legacy.distance === Infinity) return legacyPoint;
    return outside || legacy.distance < direct.distance
      ? legacy.point
      : direct.point;
  }
  // Con región pero sin coincidencia: el que menos se aleja de lo marcado.
  return direct.point;
}
