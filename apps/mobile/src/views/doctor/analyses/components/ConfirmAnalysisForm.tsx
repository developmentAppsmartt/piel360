import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useBranding } from '../../../../context/BrandingContext';
import { ApiError } from '../../../../services/api.client';
import type { ConfirmAnalysisInput } from '../../../../services/analyses.service';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';

type ConfirmAnalysisFormProps = {
  aiDiagnosis: string | null;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<void>;
  /**
   * `nosology` — abre el selector de nosologías (solo dermatológico).
   * `notes` — diagnóstico final + observaciones (estético / fototipo).
   */
  correctMode?: 'nosology' | 'notes';
  onCorrectPress?: () => void;
};

export function ConfirmAnalysisForm({
  aiDiagnosis,
  onSubmit,
  correctMode = 'notes',
  onCorrectPress,
}: ConfirmAnalysisFormProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const [correcting, setCorrecting] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState(aiDiagnosis ?? '');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ isCorrected: false });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo confirmar el análisis.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveCorrection() {
    const diagnosis = finalDiagnosis.trim();
    if (!diagnosis) {
      setError('Indica el diagnóstico final.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        isCorrected: true,
        finalDiagnosis: diagnosis,
        doctorNotes: doctorNotes.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar la corrección.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCorrectPress() {
    if (correctMode === 'nosology') {
      onCorrectPress?.();
      return;
    }
    setCorrecting(true);
    setError(null);
  }

  if (correcting && correctMode === 'notes') {
    return (
      <View style={styles.confirmBlock}>
        <Text style={styles.confirmLabel}>Diagnóstico final</Text>
        <TextInput
          style={styles.confirmInput}
          value={finalDiagnosis}
          onChangeText={setFinalDiagnosis}
          placeholder="Escribe el diagnóstico corregido"
          placeholderTextColor="#9CA3AF"
          editable={!submitting}
        />
        <Text style={styles.confirmLabel}>Observaciones</Text>
        <TextInput
          style={[styles.confirmInput, styles.confirmTextArea]}
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          placeholder="Notas del médico (opcional)"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          editable={!submitting}
        />
        {error ? <Text style={styles.confirmError}>{error}</Text> : null}
        <View style={styles.confirmActions}>
          <Pressable
            style={[
              styles.confirmPrimaryBtn,
              submitting && styles.confirmBtnDisabled,
            ]}
            onPress={() => void handleSaveCorrection()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={branding.colors.textOnDark} />
            ) : (
              <Text style={styles.confirmPrimaryText}>Guardar corrección</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.confirmOutlineBtn}
            onPress={() => setCorrecting(false)}
            disabled={submitting}
          >
            <Text style={styles.confirmOutlineText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.confirmBlock}>
      {error ? <Text style={styles.confirmError}>{error}</Text> : null}
      <View style={styles.confirmActions}>
        <Pressable
          style={[
            styles.confirmPrimaryBtn,
            submitting && styles.confirmBtnDisabled,
          ]}
          onPress={() => void handleConfirm()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={branding.colors.textOnDark} />
          ) : (
            <Text style={styles.confirmPrimaryText}>Confirmar resultado</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.confirmOutlineBtn}
          onPress={handleCorrectPress}
          disabled={submitting}
        >
          <Text style={styles.confirmOutlineText}>Corregir resultado</Text>
        </Pressable>
      </View>
    </View>
  );
}
