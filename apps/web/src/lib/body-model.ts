import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { storePlacementData } from "@/lib/body-placement";
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

  // useGLTF cachea la escena: partir de la escala original evita que una
  // segunda normalización (remontaje, StrictMode) devuelva el modelo a su
  // tamaño crudo y los clicks se guarden en otra escala.
  scene.scale.setScalar(1);
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const rawCenter = box.getCenter(new THREE.Vector3());
  const scale = 1.8 / size.y;
  scene.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(scene);
  const center = scaledBox.getCenter(new THREE.Vector3());
  scene.position.sub(center);
  scene.position.y += 1.05;
  storePlacementData(scene, rawCenter);
}

/**
 * Modelo listo para pintar: un clon propio de la escena que cachea `useGLTF`.
 *
 * Montar la escena cacheada tal cual hacía desaparecer la figura: al cambiar
 * de Mujer a Hombre y volver, o al volver a la página, el lienzo recibía la
 * misma escena que el montaje anterior ya había desligado al desmontarse, y
 * solo recargar la página la recuperaba. El clon comparte geometrías y
 * materiales (no duplica memoria), pero cada montaje tiene su propio árbol, y
 * normalizarlo aquí evita mutar la caché.
 */
export function useBodyModel(gender: Gender): THREE.Object3D {
  const { scene } = useGLTF(MODEL_PATHS[gender]);
  return useMemo(() => {
    const model = scene.clone(true);
    normalizeModel(model);
    return model;
  }, [scene]);
}

/** Figura del paciente; null si su género no se conoce. Espejo de
 * `bodyModelGenderFromPatient` del móvil: antes el web no reconocía «mujer» ni
 * «hombre», y sin género abría la de hombre mientras el móvil marcaba en la
 * de mujer, así que el punto se veía fuera de la figura. */
export function genderFromPatient(gender: string | null | undefined): Gender | null {
  const normalized = (gender ?? "").trim().toLowerCase();
  if (["female", "f", "mujer", "femenino", "femenina"].includes(normalized)) return "female";
  if (["male", "m", "hombre", "masculino", "masculina"].includes(normalized)) return "male";
  return null;
}

/** Sin género conocido, la figura con la que abre el selector (igual que el móvil). */
export const DEFAULT_BODY_GENDER: Gender = "female";
