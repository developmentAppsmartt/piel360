"use client";

import { useEffect, useMemo, useState } from "react";
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

type DisplayMarker = MapMarker & {
  displayLat: number;
  displayLng: number;
  stackedCount: number;
};

/**
 * Si varios registros comparten lat/lng (o casi), se abren en círculo
 * para que no se vea un solo pin encima de otro.
 */
function spreadOverlappingMarkers(markers: MapMarker[]): DisplayMarker[] {
  const groups = new Map<string, MapMarker[]>();
  for (const m of markers) {
    const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  const out: DisplayMarker[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const m = group[0];
      out.push({
        ...m,
        displayLat: m.lat,
        displayLng: m.lng,
        stackedCount: 1,
      });
      continue;
    }

    // ~40–90 m de radio según cuántos hay en el mismo punto
    const radius = 0.00035 + Math.min(group.length, 8) * 0.00008;
    group.forEach((m, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.push({
        ...m,
        displayLat: m.lat + radius * Math.cos(angle),
        displayLng: m.lng + radius * Math.sin(angle),
        stackedCount: group.length,
      });
    });
  }
  return out;
}

function Recenter({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [map, position.lat, position.lng]);
  return null;
}

function FitMarkerBounds({
  positions,
}: {
  positions: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  const key = positions
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .join("|");

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(
      positions.map((p) => [p.lat, p.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    // key resume las posiciones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

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
      <FitMarkerBounds
        positions={markers.map((m) => ({ lat: m.lat, lng: m.lng }))}
      />
      <ZoomAwareRegistryMarkers markers={markers} />
    </MapContainer>
  );
}

/** Por debajo de este zoom se muestran círculos con conteo por zona. */
const CLUSTER_MAX_ZOOM = 10;

type CityCluster = {
  key: string;
  label: string;
  count: number;
  lat: number;
  lng: number;
  kind: "doctor" | "patient";
  names: string[];
};

function normalizeCityLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Decimales del grid según zoom: más lejos = celdas más grandes. */
function gridDecimals(zoom: number): number {
  if (zoom < 6) return 0; // ~111 km
  if (zoom < 8) return 1; // ~11 km
  if (zoom < 10) return 2; // ~1.1 km
  return 3;
}

/**
 * Agrupa por cercanía (no solo por texto de ciudad).
 * Antes fallaba: un médico con city="Bogotá" y otro sin city
 * quedaban en clusters distintos → círculo con "1" aunque hubiera 2.
 */
function clusterByProximity(
  markers: MapMarker[],
  zoom: number,
): CityCluster[] {
  if (markers.length === 0) return [];

  const decimals = gridDecimals(zoom);
  const groups = new Map<string, MapMarker[]>();

  for (const m of markers) {
    const key = `${m.lat.toFixed(decimals)},${m.lng.toFixed(decimals)}`;
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  // Segunda pasada: unir celdas vecinas que aún queden a < umbral
  // (por redondeo en el borde de la celda).
  const thresholdDeg =
    decimals === 0 ? 0.6 : decimals === 1 ? 0.15 : decimals === 2 ? 0.04 : 0.01;

  const cells = [...groups.values()].map((list) => ({
    list,
    lat: list.reduce((s, m) => s + m.lat, 0) / list.length,
    lng: list.reduce((s, m) => s + m.lng, 0) / list.length,
  }));

  const merged: typeof cells = [];
  const used = new Set<number>();
  for (let i = 0; i < cells.length; i++) {
    if (used.has(i)) continue;
    const bucket = [...cells[i].list];
    let latSum = cells[i].lat * cells[i].list.length;
    let lngSum = cells[i].lng * cells[i].list.length;
    let n = cells[i].list.length;
    used.add(i);
    for (let j = i + 1; j < cells.length; j++) {
      if (used.has(j)) continue;
      const dLat = Math.abs(cells[i].lat - cells[j].lat);
      const dLng = Math.abs(cells[i].lng - cells[j].lng);
      if (dLat <= thresholdDeg && dLng <= thresholdDeg) {
        bucket.push(...cells[j].list);
        latSum += cells[j].lat * cells[j].list.length;
        lngSum += cells[j].lng * cells[j].list.length;
        n += cells[j].list.length;
        used.add(j);
      }
    }
    merged.push({ list: bucket, lat: latSum / n, lng: lngSum / n });
  }

  return merged.map((cell, idx) => {
    const cityCounts = new Map<string, { label: string; n: number }>();
    for (const m of cell.list) {
      const norm = normalizeCityLabel(m.city);
      if (!norm) continue;
      const prev = cityCounts.get(norm);
      cityCounts.set(norm, {
        label: m.city!.trim(),
        n: (prev?.n ?? 0) + 1,
      });
    }
    const topCity = [...cityCounts.values()].sort((a, b) => b.n - a.n)[0];

    return {
      key: `cluster-${idx}-${cell.lat.toFixed(3)}-${cell.lng.toFixed(3)}`,
      label: topCity?.label ?? "Zona",
      count: cell.list.length,
      lat: cell.lat,
      lng: cell.lng,
      kind: cell.list[0].kind,
      names: cell.list.map((m) => m.name),
    };
  });
}

function clusterCountIcon(count: number, kind: "doctor" | "patient") {
  const bg = kind === "doctor" ? "#3b82f6" : "#22c55e";
  const size = count >= 10 ? 44 : count >= 3 ? 38 : 34;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;font:700 ${count >= 10 ? 14 : 15}px/1 system-ui,sans-serif">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ZoomAwareRegistryMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  });

  const displayMarkers = useMemo(
    () => spreadOverlappingMarkers(markers),
    [markers],
  );
  const clusters = useMemo(
    () => clusterByProximity(markers, zoom),
    [markers, zoom],
  );

  if (zoom < CLUSTER_MAX_ZOOM) {
    return (
      <>
        {clusters.map((c) => (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={clusterCountIcon(c.count, c.kind)}
            eventHandlers={{
              click: () => {
                map.setView([c.lat, c.lng], Math.max(CLUSTER_MAX_ZOOM + 1, 12), {
                  animate: true,
                });
              },
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">
                  {c.label} · {c.count}{" "}
                  {c.kind === "doctor"
                    ? c.count === 1
                      ? "médico"
                      : "médicos"
                    : c.count === 1
                      ? "paciente"
                      : "pacientes"}
                </p>
                <ul className="mt-1 max-h-32 list-disc overflow-auto pl-4 text-zinc-600">
                  {c.names.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-zinc-500">
                  Clic para acercar
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </>
    );
  }

  return (
    <>
      {displayMarkers.map((m) => (
        <Marker
          key={`${m.kind}-${m.id}`}
          position={[m.displayLat, m.displayLng]}
          icon={m.kind === "doctor" ? doctorIcon : patientIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{m.name}</p>
              <p className="text-zinc-600">
                {m.kind === "doctor" ? "Doctor" : "Paciente"}
                {m.subtitle ? ` · ${m.subtitle}` : ""}
              </p>
              {m.city ? (
                <p className="text-xs text-zinc-500">{m.city}</p>
              ) : null}
              {m.stackedCount > 1 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Misma coordenada que {m.stackedCount - 1} más (separados en el
                  mapa).
                </p>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
