import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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
  const [logoFailed, setLogoFailed] = useState(false);
  const companyLogoUri =
    branding.companyLogoImage &&
    typeof branding.companyLogoImage === 'object' &&
    'uri' in branding.companyLogoImage
      ? branding.companyLogoImage.uri
      : null;

  // Sin red no se puede descargar: se guarda en disco mientras hay conexión.
  useEffect(() => {
    setLogoFailed(false);
    if (companyLogoUri) void Image.prefetch(companyLogoUri, 'disk');
  }, [companyLogoUri]);

  useEffect(
    () =>
      subscribeNetworkStatus((next) => {
        setOffline(next);
        if (next) clearAppNotices();
      }),
    [],
  );

  if (!offline) return null;

  const { colors } = branding;
  const showCompanyLogo = !!companyLogoUri && !logoFailed;
  const background = colors.screenBackground;
  const secondaryText = colors.secondaryTextOverride ?? '#1F3B63';

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
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: background ?? '#F7FAFE' },
      ]}
    >
      <LinearGradient
        colors={background ? [background, background] : ['#EAF2FC', '#F7FAFE']}
        style={[styles.hero, { paddingTop: insets.top + 32 }]}
      >
        <View style={styles.illustration}>
          <Image
            source={showCompanyLogo ? { uri: companyLogoUri } : OFFLINE_LOGO}
            accessibilityLabel={showCompanyLogo ? 'Logo de la empresa' : branding.appName}
            contentFit="contain"
            cachePolicy="disk"
            onError={() => setLogoFailed(true)}
            style={styles.logo}
          />
          <View style={[styles.badge, { borderColor: `${colors.icon}33` }]}>
            <WifiOffIcon color={colors.icon} size={26} />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.primaryText }]}>
          Sin conexión a Internet
        </Text>
      </LinearGradient>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
        <Text
          style={[
            styles.message,
            colors.secondaryTextOverride
              ? { color: colors.secondaryTextOverride }
              : null,
          ]}
        >
          Revisa tu conexión. Asegúrate de que tu Wi-Fi o datos móviles estén
          activados y el Modo Avión esté desactivado, e inténtalo de nuevo.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void retry()}
          disabled={checking}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed
                ? branding.colors.buttonHover
                : branding.colors.button,
              opacity: pressed || checking ? 0.85 : 1,
            },
          ]}
        >
          {checking ? (
            <ActivityIndicator color={branding.colors.buttonText} />
          ) : (
            <Text style={[styles.buttonText, { color: branding.colors.buttonText }]}>Intentar de nuevo</Text>
          )}
        </Pressable>

        {Platform.OS === 'android' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => BackHandler.exitApp()}
            style={[styles.linkButton, { borderColor: secondaryText }]}
          >
            <Text
              style={[
                styles.linkText,
                { color: secondaryText },
              ]}
            >
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
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
