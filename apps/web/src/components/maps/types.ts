export type LatLng = { lat: number; lng: number };

export type MapMarker = {
  id: string;
  kind: "doctor" | "patient";
  name: string;
  lat: number;
  lng: number;
  subtitle?: string | null;
};
