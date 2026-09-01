"use client";

import { LocateFixed, Search } from "lucide-react";
import { LocationPickerMap } from "@/components/maps";
import { Field, inputClass } from "@/components/auth/auth-form-primitives";
import { useLocationPicker } from "@/components/auth/use-location-picker";

export function LocationPickerSection({
  title = "Ubicación",
  description = "Busca la dirección exacta o usa tu ubicación actual.",
  picker,
}: {
  title?: string;
  description?: string;
  picker: ReturnType<typeof useLocationPicker>;
}) {
  const {
    addressQuery,
    setAddressQuery,
    address,
    location,
    suggestions,
    searchLoading,
    searchOpen,
    setSearchOpen,
    geoError,
    geoLoading,
    selectSuggestion,
    useCurrentLocation,
    onMapChange,
  } = picker;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            {title} <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
        >
          <LocateFixed className="size-4 text-sky-500" />
          {geoLoading ? "Obteniendo…" : "Usar mi ubicación"}
        </button>
      </div>

      <div className="relative isolate z-[1100]">
        <Field label="Buscar dirección exacta" required>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Ej. Calle 100 #19-54, Bogotá"
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                if (e.target.value.trim().length >= 3) {
                  setSearchOpen(true);
                } else {
                  setSearchOpen(false);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0 && addressQuery.trim().length >= 3) {
                  setSearchOpen(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              autoComplete="street-address"
            />
          </div>
        </Field>
        {searchLoading && <p className="mt-1 text-xs text-zinc-500">Buscando…</p>}
        {searchOpen && suggestions.length > 0 && (
          <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-52 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
            {suggestions.map((item) => (
              <li key={`${item.lat}-${item.lon}-${item.display_name}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-sky-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                >
                  {item.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-0 overflow-hidden rounded-xl border border-zinc-200">
        <LocationPickerMap
          value={location}
          onChange={onMapChange}
          className="h-56 w-full"
        />
      </div>
      {location && (
        <p className="text-xs text-zinc-500">
          {address || "Ubicación marcada"} · Lat {location.lat.toFixed(5)}, Lng{" "}
          {location.lng.toFixed(5)}
        </p>
      )}
      {geoError && <p className="text-sm text-red-600">{geoError}</p>}
    </section>
  );
}

export { useLocationPicker };
