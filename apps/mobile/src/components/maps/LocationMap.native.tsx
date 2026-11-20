import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';
import type { LocationMapProps } from './LocationMap.types';

const DEFAULT = { lat: 4.711, lng: -74.0721 };

/**
 * Mapa nativo con Google Maps (react-native-maps + PROVIDER_GOOGLE).
 * Requiere EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en app.config / build nativo.
 */
export function LocationMap({
  lat,
  lng,
  disabled = false,
  style,
  onPick,
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);

  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const centerLat = hasPin ? (lat as number) : DEFAULT.lat;
  const centerLng = hasPin ? (lng as number) : DEFAULT.lng;

  const region = useMemo<Region>(
    () => ({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: hasPin ? 0.012 : 0.12,
      longitudeDelta: hasPin ? 0.012 : 0.12,
    }),
    [centerLat, centerLng, hasPin],
  );

  useEffect(() => {
    if (!hasPin) return;
    mapRef.current?.animateToRegion(
      {
        latitude: lat as number,
        longitude: lng as number,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      280,
    );
  }, [hasPin, lat, lng]);

  function handlePress(e: MapPressEvent) {
    if (disabled) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPick(latitude, longitude);
  }

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onPress={handlePress}
        scrollEnabled={!disabled}
        zoomEnabled={!disabled}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {hasPin ? (
          <Marker
            coordinate={{
              latitude: lat as number,
              longitude: lng as number,
            }}
            draggable={!disabled}
            onDragEnd={(e) => {
              if (disabled) return;
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onPick(latitude, longitude);
            }}
            pinColor="#3B82F6"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8EEF5',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
