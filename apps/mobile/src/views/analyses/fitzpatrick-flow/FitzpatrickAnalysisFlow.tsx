import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ANALYSIS_PROVIDER_STATIC_LABELS } from '../../../data/analysisProviderLabel';
import { requireGuidedFaceCapture } from '../../../native/guidedCapture';
import { ApiError } from '../../../services/api.client';
import { fitzpatrickService } from '../../../services/fitzpatrick.service';
import { DoctorHeader } from '../../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../../doctor/patients/styles/patients.styles';
import { createYoucamFlowStyles } from '../youcam-flow/styles/youcamFlow.styles';
import { AnalysisModeStep } from '../AnalysisModeStep';
import { YoucamConsentStep } from '../youcam-flow/YoucamConsentStep';

const TIPS: { icon: (typeof Icons)[keyof typeof Icons]; text: string }[] = [
  {
    icon: Icons.smile,
    text: 'Selfie frontal sin maquillaje ni filtros',
  },
  {
    icon: Icons.alertCircle,
    text: 'Iluminación uniforme en el rostro (el sistema valida luz/pose)',
  },
  {
    icon: Icons.camera,
    text: 'Centra la cara en el óvalo hasta que el sistema tome la captura',
  },
];

type FitzpatrickAnalysisFlowProps = {
  patientId: string;
  patientName?: string;
  onClose: () => void;
  onAnalysisCreated: (analysisId: string) => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
  skipModeChoice?: boolean;
};

export function FitzpatrickAnalysisFlow({
  patientId,
  patientName,
  onClose,
  onAnalysisCreated,
  onOpenMenu,
  onOpenMessages,
  skipModeChoice = false,
}: FitzpatrickAnalysisFlowProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'mode' | 'consent' | 'capture'>(
    skipModeChoice ? 'consent' : 'mode',
  );
  const label = ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick;

  async function handleStart() {
    if (busy || !patientId) return;
    setBusy(true);
    try {
      const capture = await requireGuidedFaceCapture();
      const created = await fitzpatrickService.createAnalysis({
        patientId,
        imageUri: capture.uri,
      });
      onAnalysisCreated(created.analysisId);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'E_CANCELLED') return;
      Alert.alert(
        label,
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo completar el análisis de fototipo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        title={
          patientName
            ? `Fototipo · ${patientName.length > 22 ? `${patientName.slice(0, 20)}…` : patientName}`
            : 'Fototipo'
        }
        showBack
        onBack={() => {
          if (step === 'capture' && !skipModeChoice) setStep('consent');
          else if (step === 'consent' && !skipModeChoice) setStep('mode');
          else onClose();
        }}
        onOpenMenu={onOpenMenu ?? (() => undefined)}
        onOpenMessages={onOpenMessages}
      />

      {step === 'mode' ? (
        <AnalysisModeStep
          patientId={patientId}
          providerSlug="fitzpatrick"
          providerLabel={label}
          onContinueOnDevice={() => setStep('consent')}
          onRequested={onClose}
          onCancel={onClose}
        />
      ) : null}

      {step === 'consent' ? (
        <YoucamConsentStep
          title="Consentimiento"
          subtitle="Respetamos tu privacidad"
          body="Al continuar, autorizas la captura facial y la clasificación de fototipo Fitzpatrick asistida por IA según el aviso de información de Piel 360."
          bullet="• Has revisado y aceptas los términos de uso del análisis de fototipo asistido por IA."
          onNext={() => setStep('capture')}
          onCancel={onClose}
        />
      ) : null}

      {step === 'capture' ? (
        <View style={styles.card}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>
            Captura guiada facial (misma herramienta que el análisis estético). No
            se admite foto libre ni galería.
          </Text>

          <ScrollView style={styles.tipList} showsVerticalScrollIndicator={false}>
            {TIPS.map((tip) => (
              <View key={tip.text} style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <AppIcon
                    icon={tip.icon}
                    size={22}
                    color={branding.colors.primary}
                  />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
            disabled={busy}
            onPress={() => void handleStart()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Iniciar captura</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancel} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
