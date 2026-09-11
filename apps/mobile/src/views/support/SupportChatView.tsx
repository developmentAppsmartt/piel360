import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

const TAWK_PROPERTY = '6a9cd4b0d0128c34498225b8';
const TAWK_WIDGET = '1k1q9tkba';

function roleLabel(role: string | undefined): string {
  if (role === 'doctor') return 'Profesional';
  if (role === 'patient') return 'Paciente';
  if (role === 'empresa') return 'Empresa';
  if (role === 'superadmin') return 'Administrador';
  return role?.trim() || 'Usuario';
}

function buildTawkHtml(input: {
  name: string;
  email: string;
  userId: string;
  role: string;
}): string {
  const visitor = {
    name: input.name,
    ...(input.email ? { email: input.email } : {}),
  };
  const attributes = {
    name: input.name,
    ...(input.email ? { email: input.email } : {}),
    'user-id': input.userId,
    role: input.role,
    app: 'piel360-mobile',
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #tawk-embed { margin: 0; padding: 0; height: 100%; width: 100%; background: #fff; }
  </style>
</head>
<body>
  <div id="tawk-embed"></div>
  <script>
    var Tawk_API = Tawk_API || {};
    var Tawk_LoadStart = new Date();
    Tawk_API.embedded = 'tawk-embed';
    Tawk_API.visitor = ${JSON.stringify(visitor)};
    Tawk_API.onLoad = function () {
      var attrs = ${JSON.stringify(attributes)};
      if (typeof Tawk_API.setAttributes === 'function') {
        Tawk_API.setAttributes(attrs, function () {});
      }
      if (typeof Tawk_API.maximize === 'function') {
        Tawk_API.maximize();
      }
    };
    (function () {
      var s1 = document.createElement('script');
      var s0 = document.getElementsByTagName('script')[0];
      s1.async = true;
      s1.src = 'https://embed.tawk.to/${TAWK_PROPERTY}/${TAWK_WIDGET}';
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s0.parentNode.insertBefore(s1, s0);
    })();
  </script>
</body>
</html>`;
}

type SupportChatViewProps = {
  onClose: () => void;
};

export function SupportChatView({ onClose }: SupportChatViewProps) {
  const { user } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const name = user?.name?.trim() || 'Usuario Piel 360';
  const email = user?.email?.trim() || '';
  const userId = user?.id?.trim() || '';
  const role = roleLabel(user?.role);

  const html = useMemo(
    () => buildTawkHtml({ name, email, userId, role }),
    [name, email, userId, role],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={{ flex: 1, backgroundColor: branding.colors.primary }}>
      <StatusBar style="light" />
      <View
        style={{
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: 10,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: branding.colors.primary,
        }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Cerrar soporte"
        >
          <AppIcon icon={Icons.back} size={24} color={branding.colors.textOnDark} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            color: branding.colors.textOnDark,
            fontSize: 17,
            fontWeight: '800',
          }}
        >
          Soporte
        </Text>
      </View>

      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <WebView
          source={{ html, baseUrl: 'https://embed.tawk.to' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          cacheEnabled
          startInLoadingState
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          onLoadEnd={() => setLoading(false)}
          renderLoading={() => (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={branding.colors.primary} />
            </View>
          )}
        />
        {loading ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            <ActivityIndicator color={branding.colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
