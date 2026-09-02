/** @type {import('expo/config').ExpoConfig} */
const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default {
  name: 'Piel360',
  slug: 'piel360',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'piel360',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.piel360.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Piel360 usa tu ubicación para registrar la dirección del perfil.',
    },
    config: mapsApiKey
      ? {
          googleMapsApiKey: mapsApiKey,
        }
      : undefined,
  },
  android: {
    package: 'com.piel360.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: mapsApiKey
      ? {
          googleMaps: {
            apiKey: mapsApiKey,
          },
        }
      : undefined,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    'expo-image',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Piel360 usa tu ubicación para registrar la dirección del perfil.',
      },
    ],
  ],
};
