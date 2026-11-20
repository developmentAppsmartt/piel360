import { useWindowDimensions } from 'react-native';

/** Teléfono base (Pixel 9): 412 × 924 dp. */
export const PHONE_BASE_WIDTH_DP = 412;
export const PHONE_BASE_HEIGHT_DP = 924;

/**
 * Tablet pequeña de referencia: 960 × 600 dp (landscape), 320 dpi.
 * shortest ≥ 600 distingue tablet de teléfono (412 dp).
 */
export const TABLET_MIN_SHORTEST_DP = 600;

/**
 * Tablets de ~10″ en adelante (Android `sw720dp`).
 * Ahí el logo personalizado del header necesita más aire.
 */
export const TABLET_10_MIN_SHORTEST_DP = 720;

export function useDeviceLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isTablet = shortest >= TABLET_MIN_SHORTEST_DP;
  const isTablet10 = shortest >= TABLET_10_MIN_SHORTEST_DP;
  const isLandscape = width > height;

  const conventionScale = isTablet
    ? Math.min(width / PHONE_BASE_WIDTH_DP, isLandscape ? 2 : 1.55)
    : 1;

  return {
    width,
    height,
    isTablet,
    isTablet10,
    isLandscape,
    conventionScale,
  };
}
