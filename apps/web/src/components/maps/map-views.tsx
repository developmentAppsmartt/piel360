"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { LatLng, MapMarker } from "./types";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLng = { lat: 4.711, lng: -74.0721 }; // Bogotá

const doctorIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const patientIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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

export function RegistryMap({
  markers,
  className,
}: {
  markers: MapMarker[];
  className?: string;
}) {
  const center =
    markers.length > 0
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : DEFAULT_CENTER;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={markers.length ? 6 : 5}
      className={className ?? "h-[70vh] w-full rounded-xl"}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker
          key={`${m.kind}-${m.id}`}
          position={[m.lat, m.lng]}
          icon={m.kind === "doctor" ? doctorIcon : patientIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{m.name}</p>
              <p className="text-zinc-600">
                {m.kind === "doctor" ? "Doctor" : "Paciente"}
                {m.subtitle ? ` · ${m.subtitle}` : ""}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
