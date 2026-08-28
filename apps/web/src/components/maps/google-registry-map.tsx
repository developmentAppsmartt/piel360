"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, InfoWindowF, useJsApiLoader } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { MapMarker } from "./types";

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 }; // Bogotá

const mapContainerStyle = { width: "100%", height: "100%" };

function mapsApiKey() {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
}

function markerIcon(
  kind: "doctor" | "patient",
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: kind === "doctor" ? "#3b82f6" : "#22c55e",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

/**
 * Mapa de registro (médicos / pacientes) con Google Maps +
 * MarkerClusterer oficial (@googlemaps/markerclusterer).
 */
export function RegistryMap({
  markers,
  className,
}: {
  markers: MapMarker[];
  className?: string;
}) {
  const apiKey = mapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: "piel360-google-maps",
    googleMapsApiKey: apiKey || " ",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<MapMarker | null>(null);

  const center = useMemo(() => {
    if (markers.length === 0) return DEFAULT_CENTER;
    return { lat: markers[0].lat, lng: markers[0].lng };
  }, [markers]);

  useEffect(() => {
    if (!map || !isLoaded || !apiKey) return;

    const gMarkers: google.maps.Marker[] = markers.map((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        title: m.name,
        icon: markerIcon(m.kind),
      });
      marker.addListener("click", () => setSelected(m));
      return marker;
    });

    const clusterer = new MarkerClusterer({
      map,
      markers: gMarkers,
    });

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(13);
    } else if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      for (const m of markers) {
        bounds.extend({ lat: m.lat, lng: m.lng });
      }
      map.fitBounds(bounds, 48);
      const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        const z = map.getZoom();
        if (z != null && z > 14) map.setZoom(14);
      });
      return () => {
        google.maps.event.removeListener(listener);
        clusterer.clearMarkers();
        for (const marker of gMarkers) {
          google.maps.event.clearInstanceListeners(marker);
          marker.setMap(null);
        }
      };
    }

    return () => {
      clusterer.clearMarkers();
      for (const marker of gMarkers) {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
    };
  }, [map, isLoaded, apiKey, markers]);

  if (!apiKey) {
    return (
      <div
        className={
          className ??
          "flex h-[70vh] w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground"
        }
      >
        Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en apps/web/.env.local
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={
          className ??
          "flex h-[70vh] w-full items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive"
        }
      >
        No se pudo cargar Google Maps. Revisa la API key y que Maps JavaScript
        API esté habilitada.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={
          className ??
          "flex h-[70vh] w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground"
        }
      >
        Cargando Google Maps…
      </div>
    );
  }

  return (
    <div
      className={
        className ?? "h-[70vh] w-full overflow-hidden rounded-xl border border-border"
      }
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={markers.length ? 6 : 5}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        }}
      >
        {selected ? (
          <InfoWindowF
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="max-w-xs pr-1 text-sm text-zinc-900">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-zinc-600">
                {selected.kind === "doctor" ? "Doctor" : "Paciente"}
                {selected.subtitle ? ` · ${selected.subtitle}` : ""}
              </p>
              {selected.city ? (
                <p className="text-xs text-zinc-500">{selected.city}</p>
              ) : null}
            </div>
          </InfoWindowF>
        ) : null}
      </GoogleMap>
    </div>
  );
}
