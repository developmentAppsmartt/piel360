import type { ReactNode } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBranding } from '../../../../context/BrandingContext';
import { useDeviceLayout } from '../../../../styles/deviceLayout';
import { AUTH_THEME } from '../../authTheme';

type AuthBackgroundProps = {
  children: ReactNode;
};

/** Velo sobre imagen: azul oscuro a la izquierda, más transparente a la derecha. */
const SCRIM_COLORS = [
  'rgba(26, 43, 94, 0.88)',
  'rgba(14, 26, 56, 0.62)',
  'rgba(0, 0, 0, 0.28)',
] as const;

const SCRIM_LOCATIONS = [0, 0.48, 1] as const;

export function AuthBackground({ children }: AuthBackgroundProps) {
  const branding = useBranding();
  const { width, height } = useWindowDimensions();
  const { isTablet, isLandscape } = useDeviceLayout();
  const useSplitLayout = isTablet && isLandscape;
  const formPaneWidth = Math.min(width * 0.46, 520);
  const heroWidth = Math.max(width, height);

  if (useSplitLayout) {
    return (
      <View style={styles.root}>
        <View style={styles.splitRow}>
          <View style={[styles.formPane, { width: formPaneWidth }]}>
            <LinearGradient
              colors={[...AUTH_THEME.bgGradient]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.content}>{children}</View>
          </View>
          <View style={styles.heroPane}>
            <LinearGradient
              colors={[...AUTH_THEME.bgGradient]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <Image
              source={branding.loginHeroImage}
              style={styles.heroFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(14, 26, 56, 0.15)', 'rgba(0, 0, 0, 0.35)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...AUTH_THEME.bgGradient]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backLayer}
        pointerEvents="none"
      />
      <Image
        source={branding.loginHeroImage}
        style={[styles.heroImage, { width: heroWidth }]}
        resizeMode="cover"
        pointerEvents="none"
      />
      <LinearGradient
        colors={[...SCRIM_COLORS]}
        locations={[...SCRIM_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.35 }}
        style={styles.scrimLayer}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  scrimLayer: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },
  formPane: {
    maxWidth: 520,
    backgroundColor: '#0A1020',
    overflow: 'hidden',
  },
  heroPane: {
    flex: 1,
    position: 'relative',
  },
  heroFill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
