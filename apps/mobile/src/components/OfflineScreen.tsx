import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { clearAppNotices } from './notices/appNotice';
import { OFFLINE_LOGO_URI } from '../assets/offlineLogo';
import { useBranding } from '../context/BrandingContext';
import {
  checkConnectivity,
  subscribeNetworkStatus,
} from '../services/network-status';

const OFFLINE_LOGO = { uri: OFFLINE_LOGO_URI };

function WifiOffIcon({ color, size = 44 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 9.2a12 12 0 0 1 17 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M6.6 12.6a7.5 7.5 0 0 1 10.8 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M9.6 15.9a3.4 3.4 0 0 1 4.8 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={19} r={1.2} fill={color} />
      <Line
        x1={3.5}
        y1={3.5}
        x2={20.5}
        y2={20.5}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Pantalla completa que tapa la app cuando una petición falla por red.
 * `onReconnect` se llama al recuperar la conexión para recargar los datos.
 */
export function OfflineScreen({ onReconnect }: { onReconnect: () => void }) {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(
    () =>
      subscribeNetworkStatus((next) => {
        setOffline(next);
        if (next) clearAppNotices();
      }),
    [],
  );

  if (!offline) return null;

  const primary = branding.colors.primary;

  const retry = async () => {
    setChecking(true);
    const ok = await checkConnectivity();
    setChecking(false);
    if (ok) {
      clearAppNotices();
      onReconnect();
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <LinearGradient
        colors={['#EAF2FC', '#F7FAFE']}
        style={[styles.hero, { paddingTop: insets.top + 32 }]}
      >
        <View style={styles.illustration}>
          <Image
            source={OFFLINE_LOGO}
            accessibilityLabel={branding.appName}
            resizeMode="contain"
            style={styles.logo}
          />
          <View style={[styles.badge, { borderColor: `${primary}33` }]}>
            <WifiOffIcon color={primary} size={26} />
          </View>
        </View>
        <Text style={[styles.title, { color: branding.colors.primaryDark }]}>
          Sin conexión a Internet
        </Text>
      </LinearGradient>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
        <Text style={styles.message}>
          Revisa tu conexión. Asegúrate de que tu Wi-Fi o datos móviles estén
          activados y el Modo Avión esté desactivado, e inténtalo de nuevo.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void retry()}
          disabled={checking}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: primary, opacity: pressed || checking ? 0.85 : 1 },
          ]}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          )}
        </Pressable>

        {Platform.OS === 'android' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => BackHandler.exitApp()}
            style={styles.linkButton}
          >
            <Text style={[styles.linkText, { color: primary }]}>
              Cerrar aplicación
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#F7FAFE',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  illustration: {
    width: 185,
    height: 170,
  },
  logo: {
    width: 185,
    height: 170,
  },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
    color: '#1F3B63',
    textAlign: 'center',
  },
  button: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
