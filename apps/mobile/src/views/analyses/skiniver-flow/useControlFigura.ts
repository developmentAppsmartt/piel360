import { useCallback, useRef, type MutableRefObject } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import * as THREE from 'three';
import { BODY_SELECTOR_ORBIT } from '../../../data/bodyRegions';
import { desplazarCamara, girarCamara, zonaEnPantalla } from './bodyOrbit';

export type ControlesFigura = {
  dollyOut: (scale?: number) => void;
  object: THREE.Camera;
  target: THREE.Vector3;
};

function distanciaPinch(event: GestureResponderEvent): number {
  const touches = event.nativeEvent.touches;
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/** Un dedo gira. Dos dedos acercan y, arrastrándolos, mueven la vista. */
export function useControlFigura(
  readOnly: boolean,
  onElegir: (region: string, point: THREE.Vector3) => void,
) {
  const controlsRef = useRef<ControlesFigura | null>(null);
  const vistaRef = useRef<{
    camera: THREE.Camera;
    scene: THREE.Scene;
  } | null>(null);
  const medidaRef = useRef({ width: 1, height: 1 });
  const pinchRef = useRef(0);
  const dedosRef = useRef(0);
  const centroRef = useRef({ x: 0, y: 0 });
  const arrastreRef = useRef({ x: 0, y: 0, recorrido: 0 });
  const elegirRef = useRef(onElegir);
  elegirRef.current = onElegir;

  const alMedir = useCallback((event: LayoutChangeEvent) => {
    medidaRef.current = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
  }, []);

  const alTocar = useCallback((event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    dedosRef.current = touches.length;
    arrastreRef.current = {
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
      recorrido: 0,
    };
    pinchRef.current = touches.length >= 2 ? distanciaPinch(event) : 0;
    if (touches.length >= 2) {
      centroRef.current = {
        x: (touches[0].locationX + touches[1].locationX) / 2,
        y: (touches[0].locationY + touches[1].locationY) / 2,
      };
    }
  }, []);

  const alMover = useCallback((event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      const medioX = (touches[0].locationX + touches[1].locationX) / 2;
      const medioY = (touches[0].locationY + touches[1].locationY) / 2;
      if (dedosRef.current < 2) {
        pinchRef.current = distanciaPinch(event);
        centroRef.current = { x: medioX, y: medioY };
      }
      dedosRef.current = touches.length;
      const distance = distanciaPinch(event);
      const previous = pinchRef.current;
      pinchRef.current = distance;
      const controls = controlsRef.current;
      if (controls && distance > 0 && previous > 0) {
        const ratio = distance / previous;
        if (Number.isFinite(ratio) && Math.abs(ratio - 1) >= 0.001) {
          // Contra el evento anterior, no contra el inicio: al tocar el tope
          // el sentido contrario sigue teniendo efecto.
          controls.dollyOut(Math.pow(ratio, BODY_SELECTOR_ORBIT.zoomSpeed));
        }
        desplazarCamara(
          controls.object,
          controls.target,
          medioX - centroRef.current.x,
          medioY - centroRef.current.y,
          medidaRef.current.height,
        );
      }
      centroRef.current = { x: medioX, y: medioY };
      return;
    }
    dedosRef.current = touches.length;
    const controls = controlsRef.current;
    if (!controls) return;
    const x = event.nativeEvent.locationX;
    const y = event.nativeEvent.locationY;
    const dx = x - arrastreRef.current.x;
    const dy = y - arrastreRef.current.y;
    arrastreRef.current.x = x;
    arrastreRef.current.y = y;
    arrastreRef.current.recorrido += Math.hypot(dx, dy);
    girarCamara(
      controls.object,
      controls.target,
      dx,
      dy,
      medidaRef.current.height,
    );
  }, []);

  const alSoltar = useCallback(
    (event: GestureResponderEvent) => {
      const fueZoom = dedosRef.current >= 2 || pinchRef.current > 0;
      const recorrido = arrastreRef.current.recorrido;
      const { locationX, locationY } = event.nativeEvent;
      pinchRef.current = 0;
      dedosRef.current = 0;
      if (fueZoom || readOnly || recorrido > 12) return;
      const vista = vistaRef.current;
      if (!vista) return;
      const zona = zonaEnPantalla(
        locationX,
        locationY,
        medidaRef.current.width,
        medidaRef.current.height,
        vista.camera,
        vista.scene,
      );
      if (!zona) return;
      elegirRef.current(zona.region, zona.point);
    },
    [readOnly],
  );

  const alCancelar = useCallback(() => {
    pinchRef.current = 0;
    dedosRef.current = 0;
  }, []);

  return {
    controlsRef,
    vistaRef,
    alMedir,
    alTocar,
    alMover,
    alSoltar,
    alCancelar,
  };
}

export type VistaFigura = MutableRefObject<{
  camera: THREE.Camera;
  scene: THREE.Scene;
} | null>;
