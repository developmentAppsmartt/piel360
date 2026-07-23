import { Platform, type ViewStyle } from 'react-native';

/**
 * Sombra compatible con RN (iOS/Android) y RN Web (`boxShadow`).
 * En web, `shadow*` está deprecado.
 */
export function appShadow(options: {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetX?: number;
  offsetY?: number;
  elevation?: number;
}): ViewStyle {
  const {
    color = '#000',
    opacity = 0.1,
    radius = 8,
    offsetX = 0,
    offsetY = 2,
    elevation = 2,
  } = options;

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(0,0,0,${opacity})`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: offsetX, height: offsetY },
    elevation,
  };
}
