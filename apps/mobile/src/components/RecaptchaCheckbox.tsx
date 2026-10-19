import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type RecaptchaMessage =
  | { type: 'verify'; token: string }
  | { type: 'expire' }
  | { type: 'error'; message?: string }
  | { type: 'ready' }
  | { type: 'response'; token: string };

export type RecaptchaCheckboxHandle = {
  /** Lee el token actual del widget (fresco, al enviar login). */
  getToken: () => Promise<string>;
};

type RecaptchaCheckboxProps = {
  siteKey: string;
  baseUrl: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError?: (message: string) => void;
  languageCode?: string;
  disabled?: boolean;
  verified?: boolean;
  handleRef?: MutableRefObject<RecaptchaCheckboxHandle | null>;
};

const WIDGET_WIDTH = 304;
/**
 * Altura con margen: las claves de prueba de Google añaden un banner rojo
 * encima del checkbox; si se recorta a 78px el token sale inválido.
 */
const WEBVIEW_HEIGHT = 128;
const SCALE = 0.78;

function buildHtml(siteKey: string, languageCode: string): string {
  const key = JSON.stringify(siteKey);
  const safeLang = languageCode.replace(/[^a-z-]/gi, '') || 'es';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${WIDGET_WIDTH}, initial-scale=1, maximum-scale=1" />
  <script src="https://www.google.com/recaptcha/api.js?hl=${safeLang}" async defer></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: ${WIDGET_WIDTH}px;
      min-height: ${WEBVIEW_HEIGHT}px;
      background: transparent;
      overflow: hidden;
    }
    .wrap { padding: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div
      class="g-recaptcha"
      data-sitekey=${key}
      data-callback="onVerify"
      data-expired-callback="onExpire"
      data-error-callback="onError"
    ></div>
  </div>
  <script>
    function post(payload) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      } catch (e) {}
    }
    function onVerify(token) { post({ type: 'verify', token: String(token || '') }); }
    function onExpire() { post({ type: 'expire' }); }
    function onError() { post({ type: 'error', message: 'No se pudo cargar reCAPTCHA' }); }
    function readResponse() {
      var t = '';
      try {
        if (window.grecaptcha && grecaptcha.getResponse) t = grecaptcha.getResponse() || '';
      } catch (e) {}
      post({ type: 'response', token: String(t) });
    }
    window.readRecaptchaResponse = readResponse;
    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

/**
 * reCAPTCHA v2 centrado, sin caja de fondo; compacto vía scale en RN.
 */
export function RecaptchaCheckbox({
  siteKey,
  baseUrl,
  onVerify,
  onExpire,
  onError,
  languageCode = 'es',
  disabled,
  verified,
  handleRef,
}: RecaptchaCheckboxProps) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const pendingResponse = useRef<{
    resolve: (token: string) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const html = useMemo(
    () => buildHtml(siteKey, languageCode),
    [siteKey, languageCode],
  );

  const scaledWidth = Math.round(WIDGET_WIDTH * SCALE);
  const scaledHeight = Math.round(WEBVIEW_HEIGHT * SCALE);
  const offsetX = (scaledWidth - WIDGET_WIDTH) / 2;
  const offsetY = (scaledHeight - WEBVIEW_HEIGHT) / 2;

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getToken: () =>
        new Promise<string>((resolve) => {
          if (pendingResponse.current) {
            clearTimeout(pendingResponse.current.timer);
            pendingResponse.current.resolve('');
            pendingResponse.current = null;
          }
          const timer = setTimeout(() => {
            pendingResponse.current = null;
            resolve('');
          }, 2000);
          pendingResponse.current = { resolve, timer };
          webRef.current?.injectJavaScript(
            'window.readRecaptchaResponse && window.readRecaptchaResponse(); true;',
          );
        }),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  function handleMessage(event: WebViewMessageEvent) {
    let payload: RecaptchaMessage;
    try {
      payload = JSON.parse(event.nativeEvent.data) as RecaptchaMessage;
    } catch {
      return;
    }
    if (payload.type === 'ready') {
      setLoading(false);
      return;
    }
    if (payload.type === 'response') {
      const token = payload.token?.trim() ?? '';
      if (pendingResponse.current) {
        clearTimeout(pendingResponse.current.timer);
        pendingResponse.current.resolve(token);
        pendingResponse.current = null;
      }
      if (token) onVerify(token);
      return;
    }
    if (payload.type === 'verify' && payload.token) {
      setLoading(false);
      onVerify(payload.token);
      return;
    }
    if (payload.type === 'expire') {
      onExpire();
      return;
    }
    if (payload.type === 'error') {
      setLoading(false);
      onExpire();
      onError?.(payload.message ?? 'Error de reCAPTCHA');
    }
  }

  if (!siteKey.trim()) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>
          Falta configurar EXPO_PUBLIC_RECAPTCHA_SITE_KEY
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <View style={[styles.clip, { width: scaledWidth, height: scaledHeight }]}>
        {loading ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#1E5A9E" />
          </View>
        ) : null}
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html, baseUrl }}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          startInLoadingState={false}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          mixedContentMode="always"
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          containerStyle={styles.webviewContainer}
          style={{
            width: WIDGET_WIDTH,
            height: WEBVIEW_HEIGHT,
            marginLeft: offsetX,
            marginTop: offsetY,
            transform: [{ scale: SCALE }],
            backgroundColor: 'transparent',
            opacity: 0.99,
          }}
          {...(Platform.OS === 'ios'
            ? { allowsInlineMediaPlayback: true }
            : {})}
          accessibilityLabel="No soy un robot"
        />
      </View>
      {verified ? (
        <Text style={styles.verified}>Verificación completada</Text>
      ) : (
        <Text style={styles.hint}>Marca la casilla “No soy un robot”</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  clip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hint: {
    fontSize: 11,
    color: 'rgba(30,41,59,0.75)',
    textAlign: 'center',
  },
  verified: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    textAlign: 'center',
  },
  missing: {
    alignSelf: 'center',
    minHeight: 48,
    maxWidth: '100%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(220,38,38,0.12)',
    justifyContent: 'center',
  },
  missingText: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
