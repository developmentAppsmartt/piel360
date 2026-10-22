import { useState, type ReactNode } from 'react';
import { DEFAULT_BRANDING } from '../../../../config/branding.defaults';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { cachedImageSource } from '../../../../lib/image-cache';
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

const NO_SCRIM: [string, string, string] = ['transparent', 'transparent', 'transparent'];

const noPointer = { pointerEvents: 'none' as const };

export function AuthBackground({ children }: AuthBackgroundProps) {
  const branding = useBranding();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const custom = branding.loginHeroImage;
  const customUri = typeof custom === 'object' && 'uri' in custom ? custom.uri : null;
  const showingCustom = Boolean(customUri) && customUri !== failedUri;
  const heroSource =
    customUri && !showingCustom
      ? DEFAULT_BRANDING.loginHeroImage
      : customUri
        ? cachedImageSource(customUri)
        : custom;
  const onHeroError = () => {
    if (customUri) setFailedUri(customUri);
  };
  const { width, height } = useWindowDimensions();
  const { isTablet, isLandscape } = useDeviceLayout();
  const useSplitLayout = isTablet && isLandscape;
  const formPaneWidth = Math.min(width * 0.46, 520);
  // La imagen del sistema se ancla a la derecha más ancha que la pantalla; la
  // personalizada cubre la pantalla completa, igual que la vista previa del CRM.
  const heroWidth = showingCustom ? width : Math.max(width, height);

  if (useSplitLayout) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[...AUTH_THEME.bgGradient]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.backLayer, noPointer]}
        />
        {/* Detrás del formulario, la misma foto desenfocada; la nítida llena el resto. */}
        <Image
          source={heroSource}
          pointerEvents="none"
          style={styles.heroFill}
          contentFit="cover"
          cachePolicy="disk"
          blurRadius={40}
          transition={0}
        />
        <Image
          source={heroSource}
          onError={onHeroError}
          pointerEvents="none"
          style={[styles.heroBeside, { left: formPaneWidth }]}
          contentFit="cover"
          cachePolicy="disk"
          priority="high"
          transition={0}
        />
        <LinearGradient
          colors={branding.loginOverlay ? [...SCRIM_COLORS] : NO_SCRIM}
          locations={[...SCRIM_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.backLayer, noPointer]}
        />
        <View style={[styles.formPane, { width: formPaneWidth }]}>
          {children}
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
        style={[styles.backLayer, noPointer]}
      />
      <Image
        source={heroSource}
        onError={onHeroError}
        pointerEvents="none"
        style={[styles.heroImage, { width: heroWidth }]}
        contentFit="cover"
        cachePolicy="disk"
        priority="high"
        transition={0}
      />
      <LinearGradient
        colors={branding.loginOverlay ? [...SCRIM_COLORS] : NO_SCRIM}
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
    ...StyleSheet.absoluteFill,
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
  formPane: {
    flex: 1,
    maxWidth: 520,
  },
  heroBeside: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  heroFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});
