import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useBranding } from '../../context/BrandingContext';
import type { AnalysisProviderSlug } from '../../data/analysisProviderLabel';
import { ApiError } from '../../services/api.client';
import { patientsService } from '../../services/patients.service';
import { createYoucamFlowStyles } from './youcam-flow/styles/youcamFlow.styles';

type AnalysisModeStepProps = {
  patientId: string;
  providerSlug: AnalysisProviderSlug;
  providerLabel: string;
  onContinueOnDevice: () => void;
  onRequested: () => void;
  onCancel: () => void;
};

/**
 * Antes del consentimiento: el doctor sigue en su dispositivo o solicita
 * al paciente que haga el análisis en la app.
 */
export function AnalysisModeStep({
  patientId,
  providerSlug,
  providerLabel,
  onContinueOnDevice,
  onRequested,
  onCancel,
}: AnalysisModeStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await patientsService.createAnalysisRequest(patientId, providerSlug);
      Alert.alert(
        'Solicitud enviada',
        `El paciente verá «${providerLabel}» en su listado de análisis solicitados.`,
      );
      onRequested();
    } catch (err) {
      Alert.alert(
        'No se pudo solicitar',
        err instanceof ApiError
          ? err.message
          : 'Intenta de nuevo o verifica que el paciente tenga cuenta de acceso.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>¿Cómo continuar?</Text>
      <Text style={styles.subtitle}>{providerLabel}</Text>
      <Text style={styles.body}>
        Puedes realizar el análisis ahora en este dispositivo o solicitarle al
        paciente que lo complete desde su app (se desbloqueará «Nuevo Análisis»).
      </Text>

      <Pressable
        style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
        disabled={submitting}
        onPress={onContinueOnDevice}
      >
        <Text style={styles.primaryBtnText}>Seguir análisis</Text>
      </Pressable>

      <Pressable
        style={[
          styles.primaryBtn,
          {
            marginTop: 12,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: branding.colors.primary,
          },
          submitting && styles.primaryBtnDisabled,
        ]}
        disabled={submitting}
        onPress={() => void handleRequest()}
      >
        {submitting ? (
          <ActivityIndicator color={branding.colors.primary} />
        ) : (
          <Text style={[styles.primaryBtnText, { color: branding.colors.primary }]}>
            Solicitar análisis
          </Text>
        )}
      </Pressable>

      <Pressable style={styles.cancel} onPress={onCancel} disabled={submitting}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}
