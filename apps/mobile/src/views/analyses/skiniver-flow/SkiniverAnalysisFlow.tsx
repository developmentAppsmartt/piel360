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
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ANALYSIS_PROVIDER_STATIC_LABELS } from '../../../data/analysisProviderLabel';
import { ANALYSIS_CONSENT_COPY } from '../../../data/legal/documents';
import {
  BODY_PARTS_INFO,
  bodyModelGenderFromPatient,
  type BodySelection,
} from '../../../data/bodyRegions';
import { DoctorHeader } from '../../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../../doctor/patients/styles/patients.styles';
import { YoucamConsentStep } from '../youcam-flow/YoucamConsentStep';
import { createYoucamFlowStyles } from '../youcam-flow/styles/youcamFlow.styles';
import { BodySelector3D } from './BodySelector3D';
import { SkiniverProcessingStep } from './SkiniverProcessingStep';

type Step = 'consent' | 'region' | 'capture' | 'processing';

type SkiniverAnalysisFlowProps = {
  patientId: string;
  patientName?: string;
  /** Género del paciente (`female` / `male` / etc.) para el modelo 3D. */
  patientGender?: string | null;
  onClose: () => void;
  onAnalysisCreated: (analysisId: string) => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
  /** Compat: solicitudes al paciente se hacen desde la ficha. */
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
  patientGender,
  onClose,
  onAnalysisCreated,
  onOpenMenu,
  onOpenMessages,
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
  const modelGender = useMemo(
    () => bodyModelGenderFromPatient(patientGender),
    [patientGender],
  );
  const [step, setStep] = useState<Step>('consent');
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
          else onClose();
        }}
        onOpenMenu={onOpenMenu ?? (() => undefined)}
        onOpenMessages={onOpenMessages}
      />

      {step === 'consent' ? (
        <YoucamConsentStep
          title={ANALYSIS_CONSENT_COPY.skiniver.title}
          subtitle={ANALYSIS_CONSENT_COPY.skiniver.subtitle}
          body={ANALYSIS_CONSENT_COPY.skiniver.body}
          checkboxLabel={ANALYSIS_CONSENT_COPY.skiniver.checkbox}
          ctaLabel={ANALYSIS_CONSENT_COPY.skiniver.cta}
          privacyDocId={ANALYSIS_CONSENT_COPY.skiniver.privacyDocId}
          onNext={() => setStep('region')}
          onCancel={onClose}
        />
      ) : null}

      {step === 'region' ? (
        <View style={[styles.card, { flex: 1, paddingBottom: 8 }]}>
          <Text style={styles.title}>Marca la zona</Text>
          <Text style={[styles.subtitle, { marginBottom: 10 }]}>
            Selecciona en el modelo 3D la región a analizar.
          </Text>

          <View style={{ flex: 1, minHeight: 0 }}>
            <BodySelector3D
              initialGender={modelGender ?? 'female'}
              lockGender={modelGender != null}
              onSelect={setSelection}
              primaryColor={branding.colors.primary}
            />
          </View>

          {/* Acciones debajo del modelo — sin panel/elevation (evita el recuadro) */}
          <View style={{ marginTop: 12, gap: 10, zIndex: 20 }}>
            {regionLabel ? (
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: '600',
                  color: branding.colors.muted,
                }}
              >
                Zona seleccionada: {regionLabel}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                regionLabel ? `Continuar con ${regionLabel}` : 'Continuar'
              }
              style={[
                styles.primaryBtn,
                { borderRadius: 999 },
                !selection && styles.primaryBtnDisabled,
              ]}
              disabled={!selection}
              onPress={() => setStep('capture')}
            >
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              style={{
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              onPress={onClose}
            >
              <Text
                style={{
                  color: branding.colors.muted,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                Cancelar
              </Text>
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

          <Text
            style={{
              marginTop: 8,
              marginBottom: 16,
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '600',
              color: '#6B7280',
            }}
          >
            Seleccionar imagen
          </Text>

          {picking ? (
            <ActivityIndicator
              color={branding.colors.primary}
              style={{ marginVertical: 24 }}
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                gap: 28,
                marginBottom: 28,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cámara"
                disabled={picking}
                onPress={() => void handlePick('camera')}
                style={{ alignItems: 'center', gap: 10 }}
              >
                <AppIcon
                  icon={Icons.camera}
                  size={52}
                  color={branding.colors.primary}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#6B7280',
                  }}
                >
                  Cámara
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Galería"
                disabled={picking}
                onPress={() => void handlePick('library')}
                style={{ alignItems: 'center', gap: 10 }}
              >
                <AppIcon
                  icon={Icons.image}
                  size={52}
                  color={branding.colors.primary}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#6B7280',
                  }}
                >
                  Galería
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, { borderRadius: 999 }]}
            disabled={picking}
            onPress={() => setStep('region')}
          >
            <Text style={styles.primaryBtnText}>Volver a zona 3D</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
