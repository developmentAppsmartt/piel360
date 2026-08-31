"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/components/maps";

type GeocodeResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function useLocationPicker() {
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);
  const suppressAddressSearch = useRef(false);

  useEffect(() => {
    if (suppressAddressSearch.current) {
      suppressAddressSearch.current = false;
      return;
    }

    const q = addressQuery.trim();
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
  }, [addressQuery]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("format", "json");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { display_name?: string };
      if (!data.display_name) return;
      suppressAddressSearch.current = true;
      setAddress(data.display_name);
      setAddressQuery(data.display_name);
      setSuggestions([]);
      setSearchOpen(false);
    } catch {
      /* el pin basta */
    }
  }

  function selectSuggestion(item: GeocodeResult) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    suppressAddressSearch.current = true;
    setAddress(item.display_name);
    setAddressQuery(item.display_name);
    setLocation({ lat, lng });
    setSuggestions([]);
    setSearchOpen(false);
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

  function onMapChange(pos: LatLng) {
    setLocation(pos);
    setGeoError(null);
    void reverseGeocode(pos.lat, pos.lng);
  }

  const hydrate = useCallback(
    (data: {
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
    }) => {
      const addr = data.address?.trim();
      if (addr) {
        suppressAddressSearch.current = true;
        setAddress(addr);
        setAddressQuery(addr);
      }
      if (
        data.lat != null &&
        data.lng != null &&
        Number.isFinite(data.lat) &&
        Number.isFinite(data.lng)
      ) {
        setLocation({ lat: data.lat, lng: data.lng });
      }
    },
    [],
  );

  return {
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
    hydrate,
  };
}
