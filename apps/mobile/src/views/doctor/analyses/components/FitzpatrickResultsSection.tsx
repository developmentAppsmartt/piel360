import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../../context/BrandingContext';
import { ANALYSIS_PROVIDER_STATIC_LABELS } from '../../../../data/analysisProviderLabel';
import {
  FITZPATRICK_TYPES,
  type FitzpatrickResult,
  type FitzpatrickScale,
} from '../../../../data/fitzpatrickLabels';
import { PATIENT_FITZ_OPTIONS } from '../../../../data/patientFormOptions';
import type { AnalysisDetail } from '../../../../types/analysis';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';

type FitzpatrickResultsSectionProps = {
  analysis: AnalysisDetail;
  /** Si true, no muestra el mensaje de error cuando no hay fototipo. */
  silentIfEmpty?: boolean;
  /** Vista embebida (p. ej. dentro de YouCam): sin foto ni título de proveedor. */
  compact?: boolean;
};

function isFitzpatrickScale(value: string): value is FitzpatrickScale {
  return value in FITZPATRICK_TYPES;
}

/** Escala desde el análisis de fototipo o desde el perfil del paciente. */
export function resolveFitzpatrickScale(
  analysis: AnalysisDetail,
): FitzpatrickScale | null {
  const fromAnalysis = (analysis.aiRawResponse as FitzpatrickResult | null)
    ?.fitzpatrick_scale;
  if (fromAnalysis && isFitzpatrickScale(fromAnalysis)) return fromAnalysis;

  const fromPatient = analysis.patient?.fitzpatrickType?.trim();
  if (fromPatient && isFitzpatrickScale(fromPatient)) return fromPatient;

  return null;
}

export function FitzpatrickResultsSection({
  analysis,
  silentIfEmpty = false,
  compact = false,
}: FitzpatrickResultsSectionProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const scale = resolveFitzpatrickScale(analysis);
  const info = scale ? FITZPATRICK_TYPES[scale] : null;
  const swatchColor =
    (scale &&
      PATIENT_FITZ_OPTIONS.find((o) => o.value === scale)?.color) ??
    info?.colorHex;
  const showPhoto =
    !compact && analysis.hasOriginalPhoto && !!analysis.imageUrl;

  if (!info || !scale || !swatchColor) {
    if (silentIfEmpty) return null;
    return (
      <Text style={styles.note}>
        No se pudo determinar el fototipo de piel para este análisis.
      </Text>
    );
  }

  const typeLine = `Tipo ${scale} · ${info.label}`;

  return (
    <View style={styles.fitzBlock}>
      {!compact ? (
        <>
          <Text style={styles.fitzProvider}>
            {ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick}
          </Text>
          <Text style={styles.fitzSummaryLine}>
            Fototipo:{' '}
            <Text style={styles.fitzSummaryValue}>{typeLine}</Text>
          </Text>
          <View style={styles.fitzPill}>
            <Text style={styles.fitzPillText}>Fototipo</Text>
          </View>
        </>
      ) : null}

      {showPhoto ? (
        <View style={styles.fitzViewer}>
          <Image
            source={{ uri: analysis.imageUrl! }}
            style={styles.fitzViewerImage}
            contentFit="cover"
          />
        </View>
      ) : null}

      <View style={styles.fitzCard}>
        <Text style={styles.fitzEyebrow}>Resultado</Text>
        <View style={[styles.fitzSwatch, { backgroundColor: swatchColor }]} />
        <Text style={styles.fitzScale}>Tipo {scale}</Text>
        <Text style={styles.fitzLabel}>{info.label}</Text>
        <Text style={styles.fitzReaction}>{info.reaction}</Text>
      </View>
    </View>
  );
}
