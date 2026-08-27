"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import type { LatLng } from "./types";

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

type GeocodeResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country_code?: string;
    postcode?: string;
  };
};

export type AddressLocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  city?: string;
  /** Departamento / estado (Nominatim `state`). */
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

function isBadCityLabel(value: string): boolean {
  return (
    /per[ií]metro/i.test(value) ||
    /^comuna\b/i.test(value) ||
    /^barrio\b/i.test(value)
  );
}

function cityFromNominatim(
  a: GeocodeResult["address"],
  displayName?: string,
): string | undefined {
  const prefer = [a?.city, a?.town, a?.village];
  for (const c of prefer) {
    const t = c?.trim();
    if (t && !isBadCityLabel(t)) return t;
  }

  const muni = a?.municipality?.trim();
  if (muni) {
    const peri = muni.match(/per[ií]metro\s+urbano\s+(.+)/i);
    if (peri?.[1]?.trim()) return peri[1].trim();
    if (!isBadCityLabel(muni)) return muni;
  }

  if (displayName) {
    const parts = displayName.split(",").map((p) => p.trim());
    const periIdx = parts.findIndex((p) => /per[ií]metro\s+urbano/i.test(p));
    if (periIdx >= 0) {
      const fromLabel = parts[periIdx].match(/per[ií]metro\s+urbano\s+(.+)/i);
      if (fromLabel?.[1]?.trim()) return fromLabel[1].trim();
      const next = parts[periIdx + 1];
      if (next && !isBadCityLabel(next) && !/^\d+$/.test(next)) return next;
    }
  }

  return a?.state?.trim() || undefined;
}

function zipFromNominatim(
  a: GeocodeResult["address"],
  displayName?: string,
): string | undefined {
  if (a?.postcode?.trim()) return a.postcode.trim();
  const m = displayName?.match(/\b(\d{4,6})\b/);
  return m?.[1];
}

/** Departamento / estado (Colombia: Valle del Cauca, Antioquia, …). */
function departmentFromNominatim(
  a: GeocodeResult["address"],
  displayName?: string,
): string | undefined {
  const state = a?.state?.trim();
  if (state && !/^colombia$/i.test(state) && !/^rap\b/i.test(state)) {
    return state;
  }

  if (displayName) {
    const parts = displayName
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    // …, municipio, departamento, región?, CP?, país
    const withoutCountry = parts.filter(
      (p) => !/^colombia$/i.test(p) && !/^\d{4,6}$/.test(p) && !/^rap\b/i.test(p),
    );
    // Prefer a known-looking department token near the end
    for (let i = withoutCountry.length - 1; i >= 0; i--) {
      const p = withoutCountry[i];
      if (
        /^(valle del cauca|antioquia|cundinamarca|atl[aá]ntico|bol[ií]var|boyac[aá]|caldas|caquet[aá]|casanare|cauca|cesar|choc[oó]|c[oó]rdoba|guain[ií]a|guaviare|huila|la guajira|magdalena|meta|nari[nñ]o|norte de santander|putumayo|quind[ií]o|risaralda|san andr[eé]s|santander|sucre|tolima|arauca|amazonas|vichada)$/i.test(
          p,
        )
      ) {
        return p;
      }
    }
    // Fallback: penúltimo útil (antes del municipio a veces hay "Norte")
    if (withoutCountry.length >= 2) {
      return withoutCountry[withoutCountry.length - 1];
    }
  }

  return undefined;
}

export function AddressLocationPicker({
  value,
  onChange,
  showAdminFields = false,
  required = false,
  className,
  mapClassName,
}: AddressLocationPickerProps) {
  const [addressQuery, setAddressQuery] = useState(value.address);
  /** Solo se actualiza al escribir en el input — evita buscar al pinchar el mapa. */
  const [typedQuery, setTypedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  const location: LatLng | null =
    value.lat != null &&
    value.lng != null &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
      ? { lat: value.lat, lng: value.lng }
      : null;

  useEffect(() => {
    if (value.address !== addressQuery && !searchOpen) {
      setAddressQuery(value.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync externo
  }, [value.address]);

  useEffect(() => {
    const q = typedQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearchLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "co");
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("geocode");
        const data = (await res.json()) as GeocodeResult[];
        setSuggestions(data);
        setSearchOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      searchAbort.current?.abort();
    };
  }, [typedQuery]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as GeocodeResult & {
        display_name?: string;
      };
      if (!data.display_name) return;
      setAddressQuery(data.display_name);
      setTypedQuery("");
      setSuggestions([]);
      setSearchOpen(false);
      onChange({
        address: data.display_name,
        lat,
        lng,
        city: cityFromNominatim(data.address, data.display_name) ?? "",
        department:
          departmentFromNominatim(data.address, data.display_name) ??
          value.department ??
          "",
        country: data.address?.country_code
          ? data.address.country_code.toUpperCase()
          : (value.country ?? "CO"),
        zip: zipFromNominatim(data.address, data.display_name) ?? "",
      });
    } catch {
      /* el pin basta */
    }
  }

  function selectSuggestion(item: GeocodeResult) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    setAddressQuery(item.display_name);
    setTypedQuery("");
    setSuggestions([]);
    setSearchOpen(false);
    setGeoError(null);
    onChange({
      address: item.display_name,
      lat,
      lng,
      city: cityFromNominatim(item.address, item.display_name) ?? "",
      department:
        departmentFromNominatim(item.address, item.display_name) ?? "",
      country: item.address?.country_code
        ? item.address.country_code.toUpperCase()
        : (value.country ?? "CO"),
      zip: zipFromNominatim(item.address, item.display_name) ?? "",
    });
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
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoLoading(false);
        await reverseGeocode(lat, lng);
      },
      () => {
        setGeoError(
          "No se pudo obtener tu ubicación. Busca la dirección o marca el mapa.",
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const inputClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

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
              value={addressQuery}
              onChange={(e) => {
                const next = e.target.value;
                setAddressQuery(next);
                setTypedQuery(next);
                onChange({ ...value, address: next });
              }}
              onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
              autoComplete="street-address"
            />
          </div>
        </label>
        {searchLoading ? (
          <p className="mt-1 text-xs text-muted-foreground">Buscando…</p>
        ) : null}
        {searchOpen && suggestions.length > 0 ? (
          <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-background py-1 shadow-xl">
            {suggestions.map((item) => (
              <li key={`${item.lat}-${item.lon}-${item.display_name}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                >
                  {item.display_name}
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
            void reverseGeocode(pos.lat, pos.lng);
          }}
          className={mapClassName ?? "h-64 w-full"}
        />
      </div>

      {location ? (
        <p className="text-xs text-muted-foreground">
          {value.address || "Ubicación marcada"} · Lat {location.lat.toFixed(5)}
          , Lng {location.lng.toFixed(5)}
        </p>
      ) : null}
      {geoError ? <p className="text-sm text-destructive">{geoError}</p> : null}

      {showAdminFields ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Municipio / ciudad</span>
            <input
              className={inputClass}
              value={value.city ?? ""}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Departamento</span>
            <input
              className={inputClass}
              value={value.department ?? ""}
              onChange={(e) =>
                onChange({ ...value, department: e.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">País</span>
            <input
              className={inputClass}
              value={value.country ?? ""}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Código postal</span>
            <input
              className={inputClass}
              value={value.zip ?? ""}
              onChange={(e) => onChange({ ...value, zip: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
