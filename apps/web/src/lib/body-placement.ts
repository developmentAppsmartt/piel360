import * as THREE from "three";

/**
 * Coloca sobre la figura un punto guardado del selector 3D.
 *
 * Espejo de `apps/mobile/src/views/analyses/skiniver-flow/bodyModelPlacement.ts`
 * (el móvil no comparte código con el web). Si cambias uno, cambia el otro.
 *
 * Hace falta porque hay puntos guardados que no caen en la piel de la figura
 * que se pinta (medido contra producción: 19 de 186 a más de 3 cm):
 * - marcados en la figura del otro género (el selector del web abría siempre
 *   la de mujer), que en el brazo quedaban hasta 15 cm por fuera;
 * - guardados por una versión vieja del móvil que normalizaba dos veces el
 *   modelo: están en otro espacio y se corrigen con `piel360LegacyToCurrent`.
 */

/** Lo que `normalizeModel` deja en `userData` para colocar puntos. */
export function storePlacementData(
  scene: THREE.Object3D,
  rawCenter: THREE.Vector3,
) {
  // Con la versión vieja el modelo quedaba a escala 1, centrado y subido 1.05.
  const legacy = new THREE.Matrix4().makeTranslation(
    -rawCenter.x,
    -rawCenter.y + 1.05,
    -rawCenter.z,
  );
  scene.updateMatrixWorld(true);
  scene.userData.piel360LegacyToCurrent = scene.matrix.clone().multiply(legacy.invert());
  scene.userData.piel360Bounds = new THREE.Box3().setFromObject(scene);
}

type SnapResult = { point: THREE.Vector3; distance: number };

/** Acerca el punto a la piel para que el marcador no flote ni quede dentro. */
function snapPointToBody(root: THREE.Object3D, point: THREE.Vector3): SnapResult {
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
    const hit = raycaster.intersectObjects(meshes, false)[0];
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
    const worldNormal = normal.clone().transformDirection(best.object.matrixWorld).normalize();
    placed.add(worldNormal.multiplyScalar(0.012));
  }
  return { point: placed, distance: bestDist };
}

/** El punto de la piel más cercano, buscando en todos los triángulos. Solo
 * para cuando los rayos no encuentran piel cerca: un brazo marcado en la otra
 * figura queda a otra altura y los rayos horizontales pasan de largo. */
function closestSurfacePoint(root: THREE.Object3D, point: THREE.Vector3): SnapResult {
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
        best = { point: candidate.clone().add(normal.multiplyScalar(0.012)), distance };
      }
    }
  });
  return best.distance <= 0.45 ? best : { point: point.clone(), distance: Infinity };
}

/** Rayos primero (baratos); si no encuentran piel cerca, la superficie más cercana. */
function placeOnSkin(root: THREE.Object3D, point: THREE.Vector3): SnapResult {
  const snapped = snapPointToBody(root, point);
  return snapped.distance <= 0.05 ? snapped : closestSurfacePoint(root, point);
}

/**
 * Ubica el punto guardado sobre la figura, corrigiendo coordenadas antiguas.
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
  const outside = bounds ? !bounds.clone().expandByScalar(0.03).containsPoint(saved) : false;
  const quick = snapPointToBody(root, saved);
  if (!outside && quick.distance <= 0.05) return quick.point;

  const direct = placeOnSkin(root, saved);
  const matrix = root.userData.piel360LegacyToCurrent as THREE.Matrix4 | undefined;
  if (!matrix) return direct.point;
  const legacyPoint = saved.clone().applyMatrix4(matrix);
  const legacy = placeOnSkin(root, legacyPoint);

  // De los que caen en su región, el que menos mueve el punto: el brazo
  // marcado en la otra figura queda a ~10 cm de la piel buena, y la
  // corrección antigua lo mandaba más lejos aunque también al brazo.
  const sameRegion = [direct, legacy]
    .filter((c) => c.distance !== Infinity && matchesRegion?.(c.point))
    .sort((a, b) => a.point.distanceTo(saved) - b.point.distanceTo(saved))[0];
  if (sameRegion) return sameRegion.point;
  // Sin región que lo confirme, el criterio del móvil.
  if (!matchesRegion || direct.distance === Infinity) {
    if (outside && legacy.distance === Infinity) return legacyPoint;
    return outside || legacy.distance < direct.distance ? legacy.point : direct.point;
  }
  // Con región pero sin coincidencia (p. ej. nariz que cae en rostro al
  // pegarla a la piel): el que menos se aleja de donde se marcó.
  return direct.point;
}
