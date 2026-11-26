"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { reverseGeocode, type AddressOption, type ResolvedAddress } from "@/lib/geocoding";
import { AddressAdminFields } from "./address-admin-fields";
import type { LatLng } from "./types";
import { useAddressSearch } from "./use-address-search";

const LocationPickerMap = dynamic(
  () => import("./map-views").then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export type AddressLocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  city?: string;
  /** Departamento / estado. */
  department?: string;
  country?: string;
  zip?: string;
};

type AddressLocationPickerProps = {
  value: AddressLocationValue;
  onChange: (next: AddressLocationValue) => void;
  /** Si true, muestra ciudad / país / CP editables. */
  showAdminFields?: boolean;
  required?: boolean;
  className?: string;
  mapClassName?: string;
};

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

/** Dirección con búsqueda, mapa y «Usar mi ubicación» (paciente, perfil del
 * profesional, admin). La búsqueda es la de `lib/geocoding`: Google con
 * respaldo de OpenStreetMap. */
export function AddressLocationPicker({
  value,
  onChange,
  showAdminFields = false,
  required = false,
  className,
  mapClassName,
}: AddressLocationPickerProps) {
  /** Solo lo tecleado: elegir una sugerencia o marcar el mapa no busca. */
  const [typedQuery, setTypedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const { options: suggestions, loading: searchLoading } = useAddressSearch(typedQuery);

  const location: LatLng | null =
    value.lat != null && value.lng != null && Number.isFinite(value.lat) && Number.isFinite(value.lng)
      ? { lat: value.lat, lng: value.lng }
      : null;

  function applyResolved(resolved: ResolvedAddress) {
    setTypedQuery("");
    setSearchOpen(false);
    setGeoError(null);
    onChange({
      address: resolved.address,
      lat: resolved.lat,
      lng: resolved.lng,
      city: resolved.city,
      department: resolved.department || value.department || "",
      country: resolved.country || value.country || "",
      zip: resolved.zip,
    });
  }

  async function fillFromPin(lat: number, lng: number) {
    const resolved = await reverseGeocode(lat, lng);
    // Sin dirección el pin basta: se guarda la coordenada.
    if (resolved) applyResolved(resolved);
    else onChange({ ...value, lat, lng });
  }

  async function selectSuggestion(item: AddressOption) {
    setSearchOpen(false);
    const resolved = await item.resolve().catch(() => null);
    if (resolved) applyResolved(resolved);
    else setGeoError("No se pudo ubicar esa dirección. Prueba con otra o marca el mapa.");
  }

  function useCurrentLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLoading(false);
        await fillFromPin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGeoError("No se pudo obtener tu ubicación. Busca la dirección o marca el mapa.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <section className={className ?? "space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            Ubicación
            {required ? <span className="text-red-500"> *</span> : null}
          </h2>
          <p className="text-xs text-muted-foreground">
            Busca la dirección exacta o usa tu ubicación actual.
          </p>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted"
        >
          <LocateFixed className="size-4 text-sky-500" />
          {geoLoading ? "Obteniendo…" : "Usar mi ubicación"}
        </button>
      </div>

      <div className="relative isolate z-[1100]">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            Buscar dirección exacta
            {required ? <span className="text-red-500"> *</span> : null}
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Ej. Calle 100 #19-54, Bogotá"
              value={value.address}
              onChange={(e) => {
                setTypedQuery(e.target.value);
                setSearchOpen(true);
                onChange({ ...value, address: e.target.value });
              }}
              onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              autoComplete="street-address"
            />
          </div>
        </label>
        {searchLoading ? <p className="mt-1 text-xs text-muted-foreground">Buscando…</p> : null}
        {searchOpen && suggestions.length > 0 ? (
          <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-background py-1 shadow-xl">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void selectSuggestion(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative z-0 overflow-hidden rounded-xl border border-border">
        <LocationPickerMap
          value={location}
          onChange={(pos) => {
            setGeoError(null);
            void fillFromPin(pos.lat, pos.lng);
          }}
          className={mapClassName ?? "h-64 w-full"}
        />
      </div>

      {location ? (
        <p className="text-xs text-muted-foreground">
          {value.address || "Ubicación marcada"} · Lat {location.lat.toFixed(5)}, Lng{" "}
          {location.lng.toFixed(5)}
        </p>
      ) : null}
      {geoError ? <p className="text-sm text-destructive">{geoError}</p> : null}

      {showAdminFields ? (
        <AddressAdminFields value={value} onChange={onChange} inputClass={inputClass} />
      ) : null}
    </section>
  );
}
