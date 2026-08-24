import { NativeModules, Platform } from 'react-native';

type SkinAnalysisNative = {
  isAvailable: () => Promise<{
    nativeModule: boolean;
    perfectSdk: boolean;
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

const NativeSkinAnalysis = NativeModules.SkinAnalysis as SkinAnalysisNative | undefined;

export type GuidedCaptureResult = {
  uri: string;
  width: number;
  height: number;
  qualitySource: string;
  perfectSdkAvailable: boolean;
};

export const skinAnalysisNative = {
  isSupported(): boolean {
    return Platform.OS === 'android' && NativeSkinAnalysis != null;
  },

  async isAvailable() {
    if (!NativeSkinAnalysis) {
      return {
        nativeModule: false,
        perfectSdk: false,
        platform: Platform.OS,
      };
    }
    return NativeSkinAnalysis.isAvailable();
  },

  async startGuidedCapture(): Promise<GuidedCaptureResult> {
    if (!NativeSkinAnalysis) {
      throw new Error(
        Platform.OS === 'ios'
          ? 'La captura nativa YouCam aún no está disponible en iOS.'
          : 'Módulo nativo SkinAnalysis no encontrado. Recompila la app Android (dev client).',
      );
    }
    return NativeSkinAnalysis.startGuidedCapture();
  },
};
