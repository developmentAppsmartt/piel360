import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

type SkinAnalysisNative = {
  isAvailable: () => Promise<{
    nativeModule: boolean;
    perfectSdk: boolean;
    cameraCapture?: boolean;
    platform: string;
  }>;
  startGuidedCapture: () => Promise<{
    uri: string;
    width: number;
    height: number;
    qualitySource: string;
    perfectSdkAvailable: boolean;
  }>;
};

function resolveNativeModule(): SkinAnalysisNative | undefined {
  const fromTurbo = TurboModuleRegistry.get<SkinAnalysisNative>('SkinAnalysis');
  if (fromTurbo) return fromTurbo;
  return NativeModules.SkinAnalysis as SkinAnalysisNative | undefined;
}

export type GuidedCaptureResult = {
  uri: string;
  width: number;
  height: number;
  qualitySource: string;
  perfectSdkAvailable: boolean;
};

export const skinAnalysisNative = {
  isSupported(): boolean {
    return Platform.OS === 'android' && resolveNativeModule() != null;
  },

  async isAvailable() {
    const native = resolveNativeModule();
    if (!native) {
      return {
        nativeModule: false,
        perfectSdk: false,
        cameraCapture: false,
        platform: Platform.OS,
      };
    }
    return native.isAvailable();
  },

  async startGuidedCapture(): Promise<GuidedCaptureResult> {
    const native = resolveNativeModule();
    if (!native) {
      throw new Error(
        Platform.OS === 'ios'
          ? 'La captura nativa YouCam aún no está disponible en iOS.'
          : 'Módulo nativo SkinAnalysis no encontrado. Reinstala el APK nativo (no Expo Go).',
      );
    }
    return native.startGuidedCapture();
  },
};
