import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  skinAnalysisNative,
  type GuidedCaptureResult,
} from './SkinAnalysis';

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * Captura facial guiada (YouCam Camera Kit / Activity nativa).
 * Obligatoria para análisis estético y Fitzpatrick en Android.
 * Requiere APK nativo (`npm run android:apk`), no Expo Go.
 *
 * Sin PerfectLibCameraKit.aar usa CameraX (luz + óvalo) igual.
 */
export async function requireGuidedFaceCapture(): Promise<GuidedCaptureResult> {
  if (Platform.OS === 'web') {
    throw new Error(
      'La captura facial guiada requiere la app Android nativa. No funciona en el navegador.',
    );
  }
  if (Platform.OS === 'ios') {
    throw new Error(
      'La captura facial guiada aún no está disponible en iOS. Usa el build Android.',
    );
  }

  if (isExpoGo()) {
    throw new Error(
      'Estás en Expo Go. La captura nativa no existe ahí. Desinstálalo e instala el APK: apps/mobile/android/app/build/outputs/apk/release/app-release.apk',
    );
  }

  if (!skinAnalysisNative.isSupported()) {
    throw new Error(
      'El módulo SkinAnalysis no está en esta instalación. Desinstala com.piel360.app e instala el APK release recién generado.',
    );
  }

  // perfectSdk es opcional: sin AAR de Perfect seguimos con CameraX.
  return skinAnalysisNative.startGuidedCapture();
}
