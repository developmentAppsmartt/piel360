import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  skinAnalysisNative,
  type GuidedCaptureResult,
} from './SkinAnalysis';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Captura facial guiada (YouCam Camera Kit / Activity nativa).
 * Obligatoria para análisis estético y Fitzpatrick en Android.
 * Requiere APK nativo (`expo run:android` / assembleRelease), no Expo Go.
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
  if (isExpoGo() || !skinAnalysisNative.isSupported()) {
    throw new Error(
      'Falta el módulo nativo de captura. Expo Go no lo incluye. Instala el build nativo de la app.',
    );
  }

  const availability = await skinAnalysisNative.isAvailable();
  if (!availability.perfectSdk) {
    throw new Error(
      'La captura facial guiada no está disponible en este dispositivo.',
    );
  }

  return skinAnalysisNative.startGuidedCapture();
}
