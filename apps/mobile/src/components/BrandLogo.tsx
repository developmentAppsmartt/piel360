import { useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useBranding } from '../context/BrandingContext';

/** Proporción inicio.png (660×554) — pantallas de marca. */
const FULL_ASPECT = 660 / 554;
/** Proporción headers.png (2000×770) — barras de encabezado. */
const HEADER_ASPECT = 2000 / 770;

type BrandLogoProps = {
  height?: number;
  /**
   * `header` = logo blanco horizontal para barras; `full` = logo de marca;
   * `login` = logo del login, el único que personaliza el profesional/empresa.
   */
  variant?: 'header' | 'full' | 'login';
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({
  height,
  variant = 'full',
  style,
}: BrandLogoProps) {
  const branding = useBranding();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const isHeader = variant === 'header';
  const resolvedHeight = height ?? (isHeader ? 40 : 56);
  const aspect = isHeader ? HEADER_ASPECT : FULL_ASPECT;

  let source = isHeader ? branding.headerLogoImage : branding.logoImage;
  if (variant === 'login') {
    const custom = branding.loginLogoImage;
    const uri = typeof custom === 'object' && 'uri' in custom ? custom.uri : null;
    source = uri && uri === failedUri ? branding.logoImage : custom;
  }

  return (
    <Image
      source={source}
      onError={() => {
        const uri =
          typeof source === 'object' && source && 'uri' in source ? source.uri : null;
        if (uri) setFailedUri(uri);
      }}
      accessibilityLabel={branding.appName}
      resizeMode="contain"
      style={[{ height: resolvedHeight, width: resolvedHeight * aspect }, style]}
    />
  );
}
