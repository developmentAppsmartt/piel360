import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { LocationMapProps } from './LocationMap.types';

const DEFAULT = { lat: 4.711, lng: -74.0721 };

function buildMapHtml(
  lat: number,
  lng: number,
  hasPin: boolean,
  disabled: boolean,
): string {
  const zoom = hasPin ? 15 : 11;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#e8eef5; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .pin {
      width: 18px; height: 18px; border-radius: 9999px;
      background: #60a5fa; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.45);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const DISABLED = ${disabled ? 'true' : 'false'};
    const pinIcon = L.divIcon({
      className: '',
      html: '<div class="pin"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
    }).setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    let marker = null;
    function setPin(la, ln, announce) {
      if (marker) {
        marker.setLatLng([la, ln]);
      } else {
        marker = L.marker([la, ln], {
          icon: pinIcon,
          draggable: !DISABLED,
        }).addTo(map);
        marker.on('dragend', function () {
          const p = marker.getLatLng();
          post(p.lat, p.lng);
        });
      }
      map.setView([la, ln], Math.max(map.getZoom(), 14));
      if (announce) post(la, ln);
    }

    function post(la, ln) {
      if (DISABLED) return;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: la, lng: ln }));
      }
    }

    ${hasPin ? `setPin(${lat}, ${lng}, false);` : ''}

    map.on('click', function (e) {
      if (DISABLED) return;
      setPin(e.latlng.lat, e.latlng.lng, true);
    });

    function applyFromNative(la, ln) {
      if (typeof la !== 'number' || typeof ln !== 'number') return;
      if (!isFinite(la) || !isFinite(ln)) return;
      setPin(la, ln, false);
    }

    document.addEventListener('message', function (e) {
      try {
        var data = JSON.parse(e.data);
        if (data && data.type === 'set') applyFromNative(data.lat, data.lng);
      } catch (err) {}
    });
    window.addEventListener('message', function (e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.type === 'set') applyFromNative(data.lat, data.lng);
      } catch (err) {}
    });

    setTimeout(function () { map.invalidateSize(); }, 120);
  </script>
</body>
</html>`;
}

/**
 * Mapa nativo vía WebView + Leaflet/OSM.
 * No depende de Google Maps SDK (evita el mapa beige sin teselas).
 */
export function LocationMap({
  lat,
  lng,
  disabled = false,
  style,
  onPick,
}: LocationMapProps) {
  const webRef = useRef<WebView>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const centerLat = hasPin ? (lat as number) : DEFAULT.lat;
  const centerLng = hasPin ? (lng as number) : DEFAULT.lng;

  // Solo regenerar HTML al montar / cambiar disabled — updates vía inject
  const html = useMemo(
    () => buildMapHtml(centerLat, centerLng, hasPin, disabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled],
  );

  const syncPin = useCallback(() => {
    if (!hasPin) return;
    const js = `applyFromNative(${lat}, ${lng}); true;`;
    webRef.current?.injectJavaScript(js);
  }, [hasPin, lat, lng]);

  useEffect(() => {
    syncPin();
  }, [syncPin]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        lat?: number;
        lng?: number;
      };
      if (
        typeof data.lat === 'number' &&
        typeof data.lng === 'number' &&
        Number.isFinite(data.lat) &&
        Number.isFinite(data.lng)
      ) {
        onPickRef.current(data.lat, data.lng);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={onMessage}
        onLoadEnd={syncPin}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        nestedScrollEnabled
        androidLayerType="hardware"
      />
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
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
