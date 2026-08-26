"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const LocationPickerMapInner = dynamic(
  () => import("./map-views").then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        Cargando mapa…
      </div>
    ),
  },
);

const RegistryMapInner = dynamic(
  () => import("./map-views").then((m) => m.RegistryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export function LocationPickerMap(
  props: ComponentProps<typeof LocationPickerMapInner>,
) {
  return <LocationPickerMapInner {...props} />;
}

export function RegistryMap(props: ComponentProps<typeof RegistryMapInner>) {
  return <RegistryMapInner {...props} />;
}

export type { LatLng, MapMarker } from "./types";
