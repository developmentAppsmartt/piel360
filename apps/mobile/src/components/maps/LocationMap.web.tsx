import { useEffect, useId, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationMapProps } from './LocationMap.types';

const DEFAULT = { lat: 4.711, lng: -74.0721 };

const pinIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#60a5fa;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Mapa Leaflet en Expo Web (mismo concepto que el CRM). */
export function LocationMap({
  lat,
  lng,
  disabled = false,
  style,
  onPick,
}: LocationMapProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `piel360-map-${reactId}`;
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el || mapRef.current) return;

    const center = hasPin
      ? { lat: lat as number, lng: lng as number }
      : DEFAULT;
    const map = L.map(el, {
      center: [center.lat, center.lng],
      zoom: hasPin ? 15 : 11,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Solo montar una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasPin) return;

    const pos: L.LatLngExpression = [lat as number, lng as number];
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, {
        icon: pinIcon,
        draggable: !disabled,
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current?.getLatLng();
        if (p) onPickRef.current(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng(pos);
      markerRef.current.dragging?.[disabled ? 'disable' : 'enable']();
    }
    map.setView(pos, Math.max(map.getZoom(), 14), { animate: true });
  }, [hasPin, lat, lng, disabled]);

  return (
    <View style={[{ height: 220, borderRadius: 14, overflow: 'hidden' }, style]}>
      {/* div nativo para Leaflet en react-native-web */}
      <div
        id={containerId}
        style={{ width: '100%', height: '100%', minHeight: 220 }}
      />
    </View>
  );
}
