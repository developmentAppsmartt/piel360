"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/components/maps";
import { useAddressSearch } from "@/components/maps/use-address-search";
import { reverseGeocode, type AddressOption, type ResolvedAddress } from "@/lib/geocoding";
import { countryCodeFromNominatim } from "@/lib/nominatim-address";

/** Ubicación del registro de profesional y empresa y del perfil de empresa. */
export function useLocationPicker() {
  const [addressQuery, setAddressQueryState] = useState("");
  /** Solo lo tecleado: elegir una sugerencia o marcar el mapa no busca. */
  const [typedQuery, setTypedQuery] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const { options: suggestions, loading: searchLoading } = useAddressSearch(typedQuery);

  function setAddressQuery(value: string) {
    setAddressQueryState(value);
    setTypedQuery(value);
  }

  function applyResolved(resolved: ResolvedAddress) {
    setTypedQuery("");
    setSearchOpen(false);
    setAddress(resolved.address);
    setAddressQueryState(resolved.address);
    setCountry((prev) => resolved.country || prev);
  }

  async function fillFromPin(lat: number, lng: number) {
    const resolved = await reverseGeocode(lat, lng);
    if (resolved) applyResolved(resolved);
  }

  async function selectSuggestion(item: AddressOption) {
    setSearchOpen(false);
    const resolved = await item.resolve().catch(() => null);
    if (!resolved) {
      setGeoError("No se pudo ubicar esa dirección. Prueba con otra o marca el mapa.");
      return;
    }
    applyResolved(resolved);
    setLocation({ lat: resolved.lat, lng: resolved.lng });
    setGeoError(null);
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
        setLocation({ lat, lng });
        setGeoLoading(false);
        await fillFromPin(lat, lng);
      },
      () => {
        setGeoError("No se pudo obtener tu ubicación. Busca la dirección o marca el mapa.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function onMapChange(pos: LatLng) {
    setLocation(pos);
    setGeoError(null);
    void fillFromPin(pos.lat, pos.lng);
  }

  const hydrate = useCallback(
    (data: {
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
      country?: string | null;
    }) => {
      const addr = data.address?.trim();
      if (addr) {
        setTypedQuery("");
        setAddress(addr);
        setAddressQueryState(addr);
        setSearchOpen(false);
      }
      if (data.country?.trim()) {
        setCountry(data.country.trim().toUpperCase());
      } else if (addr) {
        setCountry(countryCodeFromNominatim(null, addr));
      }
      if (data.lat != null && data.lng != null && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        setLocation({ lat: data.lat, lng: data.lng });
      }
    },
    [],
  );

  return {
    addressQuery,
    setAddressQuery,
    address,
    country,
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
    hydrate,
  };
}
