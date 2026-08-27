import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { DoctorHeader } from '../../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../../doctor/patients/styles/patients.styles';
import { AnalysisModeStep } from '../AnalysisModeStep';
import { YoucamConsentStep } from './YoucamConsentStep';
import { YoucamInstructionsStep } from './YoucamInstructionsStep';
import { YoucamProcessingStep } from './YoucamProcessingStep';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

type Step = 'mode' | 'consent' | 'instructions' | 'processing';

type YoucamAnalysisFlowProps = {
  patientId: string;
  onClose: () => void;
  onAnalysisCreated: (analysisId: string) => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
  patientName?: string;
  /** Si true (flujo paciente tras solicitud), salta la elección Seguir/Solicitar. */
  skipModeChoice?: boolean;
};

export function YoucamAnalysisFlow({
  patientId,
  onClose,
  onAnalysisCreated,
  onOpenMenu,
  onOpenMessages,
  patientName,
  skipModeChoice = false,
}: YoucamAnalysisFlowProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [step, setStep] = useState<Step>(
    skipModeChoice ? 'consent' : 'mode',
  );
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleDone = useCallback(
    (analysisId: string) => {
      onAnalysisCreated(analysisId);
    },
    [onAnalysisCreated],
  );

  const handleError = useCallback(
    (message: string) => {
      Alert.alert('Análisis estético', message);
      setImageUri(null);
      setStep('instructions');
    },
    [],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {step !== 'processing' ? (
        <DoctorHeader
          styles={headerStyles}
          title={
            patientName
              ? `Estético · ${patientName.length > 22 ? `${patientName.slice(0, 20)}…` : patientName}`
              : 'Estético'
          }
          showBack
          onBack={() => {
            if (step === 'instructions') setStep('consent');
            else if (step === 'consent' && !skipModeChoice) setStep('mode');
            else onClose();
          }}
          onOpenMenu={onOpenMenu ?? (() => undefined)}
          onOpenMessages={onOpenMessages}
        />
      ) : null}

      {step === 'mode' ? (
        <AnalysisModeStep
          patientId={patientId}
          providerSlug="youcam"
          providerLabel="Análisis estético"
          onContinueOnDevice={() => setStep('consent')}
          onRequested={onClose}
          onCancel={onClose}
        />
      ) : null}

      {step === 'consent' ? (
        <YoucamConsentStep
          onNext={() => setStep('instructions')}
          onCancel={onClose}
        />
      ) : null}

      {step === 'instructions' ? (
        <YoucamInstructionsStep
          onCancel={onClose}
          onCaptured={(uri) => {
            setImageUri(uri);
            setStep('processing');
          }}
        />
      ) : null}

      {step === 'processing' && imageUri ? (
        <YoucamProcessingStep
          patientId={patientId}
          imageUri={imageUri}
          onDone={handleDone}
          onError={handleError}
        />
      ) : null}
    </View>
  );
}
