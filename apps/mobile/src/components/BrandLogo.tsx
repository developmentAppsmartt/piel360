import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useBranding } from '../context/BrandingContext';

/** Proporción inicio.png (660×554) — pantallas de marca. */
const FULL_ASPECT = 660 / 554;
/** Proporción headers.png (2000×770) — barras de encabezado. */
const HEADER_ASPECT = 2000 / 770;

type BrandLogoProps = {
  height?: number;
  /** `header` = logo blanco horizontal para barras; `full` = logo de marca. */
  variant?: 'header' | 'full';
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({
  height,
  variant = 'full',
  style,
}: BrandLogoProps) {
  const branding = useBranding();
  const isHeader = variant === 'header';
  const resolvedHeight = height ?? (isHeader ? 40 : 56);
  const aspect = isHeader ? HEADER_ASPECT : FULL_ASPECT;

  return (
    <Image
      source={isHeader ? branding.headerLogoImage : branding.logoImage}
      accessibilityLabel={branding.appName}
      resizeMode="contain"
      style={[{ height: resolvedHeight, width: resolvedHeight * aspect }, style]}
    />
  );
}
