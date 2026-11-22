"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import type { LatLng } from "./types";

const DEFAULT_CENTER: LatLng = { lat: 4.711, lng: -74.0721 }; // Bogotá
const mapContainerStyle = { width: "100%", height: "100%" };

/**
 * Selector de ubicación con Google Maps (formulario de paciente y perfiles):
 * un clic elige el punto. Si la clave falla o Google no carga, pinta
 * `fallback` (el mapa de OSM) para que el formulario nunca se quede sin mapa.
 */
export function GoogleLocationPickerMap({
  apiKey,
  value,
  onChange,
  className,
  fallback,
}: {
  apiKey: string;
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  className?: string;
  fallback: ReactNode;
}) {
  // Mismo id y opciones que el mapa de «Mapas»: el cargador es uno solo.
  const { isLoaded, loadError } = useJsApiLoader({
    id: "piel360-google-maps",
    googleMapsApiKey: apiKey,
  });
  const [authFailure, setAuthFailure] = useState(false);

  useEffect(() => {
    const win = window as Window & { gm_authFailure?: () => void };
    const previous = win.gm_authFailure;
    win.gm_authFailure = () => {
      setAuthFailure(true);
      previous?.();
    };
    return () => {
      win.gm_authFailure = previous;
    };
  }, []);

  if (loadError || authFailure) return <>{fallback}</>;
  if (!isLoaded) {
    return (
      <div className={className ?? "h-56 w-full rounded-xl"}>
        <div className="flex size-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
          Cargando mapa…
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? "h-56 w-full overflow-hidden rounded-xl"}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={value ?? DEFAULT_CENTER}
        zoom={value ? 15 : 11}
        onClick={(e) => {
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (lat != null && lng != null) onChange({ lat, lng });
        }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false }}
      >
        {value ? <MarkerF position={value} /> : null}
      </GoogleMap>
    </div>
  );
}
