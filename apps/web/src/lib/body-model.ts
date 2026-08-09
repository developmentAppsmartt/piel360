import * as THREE from "three";
import { normalizeMeshName } from "@/lib/body-regions";

export const MODEL_PATHS = {
  female: "/models/female/realistic_female_character_new.glb",
  male: "/models/male/realistic_male_character_new.glb",
} as const;

export type Gender = keyof typeof MODEL_PATHS;

// Port de human-body-selector.js: escala a 1.8 de alto, centrado, +1.05 en Y
// — los umbrales de inferBodyPartFromPoint asumen exactamente esta normalización.
export function normalizeModel(scene: THREE.Object3D) {
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

/** Mismo criterio que `ViewPatient3DHistory.php` (sistema viejo) para
 * decidir el modelo GLB inicial a partir del género del paciente. */
export function genderFromPatient(gender: string | null | undefined): Gender {
  const normalized = (gender ?? "").toLowerCase();
  return ["female", "f", "femenino", "femenina"].includes(normalized) ? "female" : "male";
}
