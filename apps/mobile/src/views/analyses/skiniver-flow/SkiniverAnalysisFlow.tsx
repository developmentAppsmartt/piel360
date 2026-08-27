import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { ANALYSIS_PROVIDER_STATIC_LABELS } from '../../../data/analysisProviderLabel';
import {
  BODY_PARTS_INFO,
  type BodySelection,
} from '../../../data/bodyRegions';
import { DoctorHeader } from '../../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../../doctor/patients/styles/patients.styles';
import { YoucamConsentStep } from '../youcam-flow/YoucamConsentStep';
import { createYoucamFlowStyles } from '../youcam-flow/styles/youcamFlow.styles';
import { AnalysisModeStep } from '../AnalysisModeStep';
import { BodySelector3D } from './BodySelector3D';
import { SkiniverProcessingStep } from './SkiniverProcessingStep';

type Step = 'mode' | 'consent' | 'region' | 'capture' | 'processing';

type SkiniverAnalysisFlowProps = {
  patientId: string;
  patientName?: string;
  onClose: () => void;
  onAnalysisCreated: (analysisId: string) => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
  skipModeChoice?: boolean;
};

async function pickCloseUp(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cámara', 'Necesitamos permiso de cámara para la zona marcada.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.95,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Galería', 'Necesitamos acceso a la galería.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.95,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

function shortHeaderTitle(patientName?: string): string {
  const base = 'Dermatológico';
  if (!patientName?.trim()) return base;
  const name = patientName.trim();
  return name.length > 22 ? `${base} · ${name.slice(0, 20)}…` : `${base} · ${name}`;
}

export function SkiniverAnalysisFlow({
  patientId,
  patientName,
  onClose,
  onAnalysisCreated,
  onOpenMenu,
  onOpenMessages,
  skipModeChoice = false,
}: SkiniverAnalysisFlowProps) {
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
  const [selection, setSelection] = useState<BodySelection | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const label = ANALYSIS_PROVIDER_STATIC_LABELS.skiniver;
  const regionLabel = selection
    ? BODY_PARTS_INFO[selection.bodyRegion]?.label ?? selection.bodyRegion
    : null;

  async function handlePick(source: 'camera' | 'library') {
    if (picking || !patientId || !selection) return;
    setPicking(true);
    try {
      const uri = await pickCloseUp(source);
      if (!uri) return;
      setImageUri(uri);
      setStep('processing');
    } finally {
      setPicking(false);
    }
  }

  if (step === 'processing' && imageUri && selection) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <DoctorHeader
          styles={headerStyles}
          title={shortHeaderTitle(patientName)}
          showBack
          onBack={onClose}
          onOpenMenu={onOpenMenu ?? (() => undefined)}
          onOpenMessages={onOpenMessages}
        />
        <SkiniverProcessingStep
          patientId={patientId}
          imageUri={imageUri}
          selection={selection}
          onDone={onAnalysisCreated}
          onError={(message) => {
            Alert.alert(label, message);
            setStep('capture');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        title={shortHeaderTitle(patientName)}
        showBack
        onBack={() => {
          if (step === 'capture') setStep('region');
          else if (step === 'region') setStep('consent');
          else if (step === 'consent' && !skipModeChoice) setStep('mode');
          else onClose();
        }}
        onOpenMenu={onOpenMenu ?? (() => undefined)}
        onOpenMessages={onOpenMessages}
      />

      {step === 'mode' ? (
        <AnalysisModeStep
          patientId={patientId}
          providerSlug="skiniver"
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
          body="Al continuar, autorizas la captura de imágenes de la zona cutánea y el procesamiento asistido por IA según el aviso de información de Piel 360, incluyendo la retención y eliminación de tus datos conforme a la política aplicable."
          bullet="• Has revisado y aceptas los términos de uso del análisis dermatológico asistido por IA."
          onNext={() => setStep('region')}
          onCancel={onClose}
        />
      ) : null}

      {step === 'region' ? (
        <View style={[styles.card, { flex: 1, paddingBottom: 12 }]}>
          <Text style={styles.title}>Marca la zona</Text>
          <Text style={[styles.subtitle, { marginBottom: 10 }]}>
            Selecciona en el modelo 3D la región a analizar.
          </Text>

          <View style={{ flex: 1, minHeight: 0 }}>
            <BodySelector3D
              onSelect={setSelection}
              primaryColor={branding.colors.primary}
            />
          </View>

          {/* elevation evita que el GLView tape el botón en algunos dispositivos */}
          <View
            style={{
              marginTop: 12,
              zIndex: 20,
              elevation: 20,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Pressable
              style={[styles.primaryBtn, !selection && { opacity: 0.5 }]}
              disabled={!selection}
              onPress={() => setStep('capture')}
            >
              <Text style={styles.primaryBtnText}>
                Continuar{regionLabel ? ` · ${regionLabel}` : ''}
              </Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 'capture' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Foto de la zona</Text>
          <Text style={styles.subtitle}>
            Enfoca de cerca {regionLabel ?? 'la zona marcada'}. Usa buena luz y
            recorta para que la lesión ocupe el marco.
          </Text>
          <Pressable
            style={[styles.primaryBtn, picking && { opacity: 0.7 }]}
            disabled={picking}
            onPress={() => void handlePick('camera')}
          >
            {picking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Tomar foto enfocada</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.cancel, { marginTop: 10 }]}
            disabled={picking}
            onPress={() => void handlePick('library')}
          >
            <Text style={styles.cancelText}>Elegir de la galería</Text>
          </Pressable>
          <Pressable
            style={styles.cancel}
            disabled={picking}
            onPress={() => setStep('region')}
          >
            <Text style={styles.cancelText}>Cambiar zona 3D</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
