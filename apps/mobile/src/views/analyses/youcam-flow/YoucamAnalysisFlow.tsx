import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { DoctorHeader } from '../../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../../doctor/patients/styles/patients.styles';
import { YoucamConsentStep } from './YoucamConsentStep';
import { YoucamInstructionsStep } from './YoucamInstructionsStep';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

type Step = 'consent' | 'instructions';

type YoucamAnalysisFlowProps = {
  onClose: () => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
  /** Nombre opcional del paciente (vista doctor). */
  patientName?: string;
};

export function YoucamAnalysisFlow({
  onClose,
  onOpenMenu,
  onOpenMessages,
  patientName,
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
  const [step, setStep] = useState<Step>('consent');

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        title={
          patientName
            ? `Análisis · ${patientName}`
            : 'Análisis estado de la piel'
        }
        showBack
        onBack={() => {
          if (step === 'instructions') setStep('consent');
          else onClose();
        }}
        onOpenMenu={onOpenMenu ?? (() => undefined)}
        onOpenMessages={onOpenMessages}
      />
      {step === 'consent' ? (
        <YoucamConsentStep
          onNext={() => setStep('instructions')}
          onCancel={onClose}
        />
      ) : (
        <YoucamInstructionsStep onCancel={onClose} />
      )}
    </View>
  );
}
