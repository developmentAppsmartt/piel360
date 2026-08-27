import { useEffect, useRef } from 'react';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { LocationMapProps } from './LocationMap.types';

const DEFAULT_REGION: Region = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function toRegion(lat: number, lng: number): Region {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };
}

/** Solo iOS/Android — no se embebe en el bundle web. */
export function LocationMap({
  lat,
  lng,
  disabled = false,
  style,
  onPick,
}: LocationMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  useEffect(() => {
    if (!hasPin) return;
    mapRef.current?.animateToRegion(toRegion(lat as number, lng as number), 350);
  }, [hasPin, lat, lng]);

  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={
        hasPin ? toRegion(lat as number, lng as number) : DEFAULT_REGION
      }
      onPress={(e) => {
        if (disabled) return;
        const { latitude, longitude } = e.nativeEvent.coordinate;
        onPick(latitude, longitude);
      }}
    >
      {hasPin ? (
        <Marker
          coordinate={{
            latitude: lat as number,
            longitude: lng as number,
          }}
          draggable={!disabled}
          onDragEnd={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onPick(latitude, longitude);
          }}
        />
      ) : null}
    </MapView>
  );
}
