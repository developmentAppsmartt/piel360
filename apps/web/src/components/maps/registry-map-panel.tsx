"use client";

import { useQuery } from "@tanstack/react-query";
import { RegistryMap, type MapMarker } from "@/components/maps";
import { apiClientFetch } from "@/lib/api-client";

type MapMarkersResponse = {
  doctors: Array<{
    id: string;
    kind: "doctor";
    name: string;
    specialty?: string | null;
    city?: string | null;
    lat: number;
    lng: number;
  }>;
  patients: Array<{
    id: string;
    kind: "patient";
    name: string;
    city?: string | null;
    lat: number;
    lng: number;
  }>;
};

export function RegistryMapPanel({
  title,
  description,
  endpoint,
  kind,
}: {
  title: string;
  description: string;
  endpoint: string;
  kind: "doctor" | "patient";
}) {
  const query = useQuery({
    queryKey: ["map-markers", endpoint, kind],
    queryFn: () =>
      apiClientFetch<MapMarkersResponse>(
        `${endpoint}?kind=${kind === "doctor" ? "doctor" : "patient"}`,
      ),
  });

  const markers: MapMarker[] =
    kind === "doctor"
      ? (query.data?.doctors.map((d) => ({
          id: d.id,
          kind: "doctor" as const,
          name: d.name,
          lat: d.lat,
          lng: d.lng,
          subtitle: d.specialty ?? d.city,
          city: d.city,
        })) ?? [])
      : (query.data?.patients.map((p) => ({
          id: p.id,
          kind: "patient" as const,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          subtitle: p.city,
          city: p.city,
        })) ?? []);

  const uniquePoints = new Set(
    markers.map((m) => `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`),
  ).size;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {query.isLoading ? (
        <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
          Cargando marcadores…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar el mapa.
          {query.error instanceof Error && query.error.message
            ? ` ${query.error.message}`
            : null}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {markers.length}{" "}
            {kind === "doctor" ? "médicos" : "pacientes"} con ubicación
            {uniquePoints > 0 && uniquePoints < markers.length
              ? ` · ${uniquePoints} puntos distintos (agrupados con clusters al alejar el zoom)`
              : null}
            {" · "}
            Google Maps
          </p>
          <RegistryMap markers={markers} />
        </>
      )}
    </div>
  );
}
