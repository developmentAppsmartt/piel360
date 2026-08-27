import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useBranding } from '../context/BrandingContext';

/** Proporción del asset logo-piel360.png (612×408). */
const LOGO_ASPECT = 612 / 408;

type BrandLogoProps = {
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({ height = 44, style }: BrandLogoProps) {
  const branding = useBranding();

  return (
    <Image
      source={branding.logoImage}
      accessibilityLabel={branding.appName}
      resizeMode="contain"
      style={[{ height, width: height * LOGO_ASPECT }, style]}
    />
  );
}
