import * as THREE from 'three';
import {
  BODY_PARTS_INFO,
  BODY_SELECTOR_ORBIT,
  inferBodyPartFromPoint,
  normalizeMeshName,
} from '../../../data/bodyRegions';

const offset = new THREE.Vector3();
const spherical = new THREE.Spherical();
const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const shift = new THREE.Vector3();
const antes = new THREE.Vector3();

/** Un dedo gira la cámara alrededor del punto que está mirando. */
export function girarCamara(
  camera: THREE.Camera,
  target: THREE.Vector3,
  dx: number,
  dy: number,
  alto: number,
): void {
  if (alto <= 0) return;
  offset.subVectors(camera.position, target);
  if (offset.lengthSq() < 1e-8) return;
  spherical.setFromVector3(offset);
  spherical.theta -= (2 * Math.PI * dx) / alto;
  spherical.phi -= (2 * Math.PI * dy) / alto;
  const tope = 0.08;
  spherical.phi = Math.max(tope, Math.min(Math.PI - tope, spherical.phi));
  spherical.radius = THREE.MathUtils.clamp(
    spherical.radius,
    BODY_SELECTOR_ORBIT.minDistance,
    BODY_SELECTOR_ORBIT.maxDistance,
  );
  offset.setFromSpherical(spherical);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

/** Dos dedos arrastran la vista ya acercada. El modelo sigue los dedos. */
export function desplazarCamara(
  camera: THREE.Camera,
  target: THREE.Vector3,
  dx: number,
  dy: number,
  alto: number,
): void {
  if (alto <= 0 || (dx === 0 && dy === 0)) return;
  camera.updateMatrix();
  offset.subVectors(camera.position, target);
  const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 40;
  const alcance = offset.length() * Math.tan((fov * Math.PI) / 360);
  const factor = (2 * alcance) / alto;
  right.setFromMatrixColumn(camera.matrix, 0);
  up.setFromMatrixColumn(camera.matrix, 1);
  shift.copy(right).multiplyScalar(-dx * factor);
  shift.addScaledVector(up, dy * factor);
  target.add(shift);
  camera.position.add(shift);
  antes.copy(target);
  target.x = THREE.MathUtils.clamp(target.x, -0.9, 0.9);
  target.y = THREE.MathUtils.clamp(target.y, 0.05, 2.05);
  target.z = THREE.MathUtils.clamp(target.z, -0.55, 0.55);
  camera.position.add(shift.copy(target).sub(antes));
  camera.lookAt(target);
}

/** Toque corto: la zona del cuerpo bajo el dedo. */
export function zonaEnPantalla(
  x: number,
  y: number,
  width: number,
  height: number,
  camera: THREE.Camera,
  scene: THREE.Object3D,
): { region: string; point: THREE.Vector3 } | null {
  if (width <= 0 || height <= 0) return null;
  ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const meshName = normalizeMeshName(hit.object.name);
    if (!meshName) continue;
    const region = BODY_PARTS_INFO[meshName]
      ? meshName
      : inferBodyPartFromPoint(hit.point);
    return { region, point: hit.point.clone() };
  }
  return null;
}
