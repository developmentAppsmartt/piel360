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
        })) ?? [])
      : (query.data?.patients.map((p) => ({
          id: p.id,
          kind: "patient" as const,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          subtitle: p.city,
        })) ?? []);

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
        <p className="text-sm text-destructive">No se pudo cargar el mapa.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {markers.length} ubicaciones
          </p>
          <RegistryMap markers={markers} />
        </>
      )}
    </div>
  );
}
