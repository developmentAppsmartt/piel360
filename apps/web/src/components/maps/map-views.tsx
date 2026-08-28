"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "./types";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLng = { lat: 4.711, lng: -74.0721 }; // Bogotá

const pickIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#60a5fa;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [map, position.lat, position.lng]);
  return null;
}

function ClickPicker({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Selector de ubicación (perfil / registro). Sigue en Leaflet + OSM. */
export function LocationPickerMap({
  value,
  onChange,
  className,
}: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  className?: string;
}) {
  const center = value ?? DEFAULT_CENTER;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={value ? 14 : 11}
      className={className ?? "h-56 w-full rounded-xl"}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickPicker onPick={onChange} />
      {value ? (
        <>
          <Marker position={[value.lat, value.lng]} icon={pickIcon} />
          <Recenter position={value} />
        </>
      ) : null}
    </MapContainer>
  );
}

// RegistryMap (médicos/pacientes) vive en google-registry-map.tsx
export { RegistryMap } from "./google-registry-map";
