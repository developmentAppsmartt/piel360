import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { ApiError } from '../../../../services/api.client';
import {
  encyclopediaService,
  stripHtml,
} from '../../../../services/encyclopedia.service';
import type {
  AnalysisDetail,
  SkiniverDiagnosisCandidate,
  SkiniverRawResponse,
} from '../../../../types/analysis';
import { normalizedProb, parseSkiniverPrediction } from '../../../../types/analysis';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';
import { AnalysisImageCarousel } from './AnalysisImageCarousel';
import { SkiniverRiskGauge } from './SkiniverRiskGauge';

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#facc15',
  high: '#ef4444',
};

function riskBannerColors(risk: string): { bg: string; border: string; text: string } {
  const key = risk.toLowerCase();
  if (key.includes('alto') || key.includes('high')) {
    return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' };
  }
  if (key.includes('bajo') || key.includes('low')) {
    return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' };
  }
  return { bg: '#FFFBEB', border: '#FDE68A', text: '#A16207' };
}

function DiagnosisCard({
  item,
  onPress,
  styles,
}: {
  item: SkiniverDiagnosisCandidate;
  onPress: () => void;
  styles: ReturnType<typeof createAnalysisDetailStyles>;
}) {
  const prob = normalizedProb(item.prob);
  const color = RISK_COLORS[item.risk_level ?? ''] ?? RISK_COLORS.medium;

  return (
    <Pressable style={styles.diagnosisCard} onPress={onPress}>
      <View style={[styles.diagnosisRing, { borderColor: color }]}>
        <Text style={[styles.diagnosisProb, { color }]}>
          {Math.round(prob)}%
        </Text>
      </View>
      <View style={styles.diagnosisBody}>
        <Text style={styles.diagnosisTitle} numberOfLines={2}>
          {item.class}
        </Text>
        {item.desease ? (
          <Text style={styles.diagnosisSub} numberOfLines={1}>
            {item.desease}
          </Text>
        ) : null}
        {item.risk ? (
          <Text style={styles.diagnosisSub}>Riesgo: {item.risk}</Text>
        ) : null}
      </View>
      <AppIcon icon={Icons.chevronRight} size={20} color="#9CA3AF" />
    </Pressable>
  );
}

type SkiniverResultsSectionProps = {
  analysis: AnalysisDetail;
};

export function SkiniverResultsSection({
  analysis,
}: SkiniverResultsSectionProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const prediction = parseSkiniverPrediction(
    analysis.aiRawResponse as SkiniverRawResponse | null,
  );

  const riskLabel = prediction?.risk ?? analysis.aiDiagnosis ?? '—';
  const gaugePercent = (() => {
    const raw = prediction?.high_risk_prob ?? analysis.aiProbability ?? 0;
    return raw <= 1 ? raw * 100 : raw;
  })();

  const topn = Array.isArray(prediction?.topn) ? prediction.topn : [];
  const top =
    topn[0] ??
    (prediction?.class
      ? {
          class: prediction.class,
          prob: prediction.prob ?? analysis.aiProbability ?? 0,
          risk: prediction.risk ?? '—',
          desease: undefined,
        }
      : null);

  const conclusionLabel =
    analysis.finalDiagnosis ??
    analysis.aiDiagnosis ??
    top?.class ??
    'Sin diagnóstico';
  const conclusionProb =
    top != null
      ? Math.round(normalizedProb(top.prob))
      : analysis.aiProbability != null
        ? Math.round(normalizedProb(analysis.aiProbability))
        : null;

  const banner = riskBannerColors(String(riskLabel));

  const [selected, setSelected] = useState<SkiniverDiagnosisCandidate | null>(
    null,
  );
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  async function openDiagnosis(item: SkiniverDiagnosisCandidate) {
    setSelected(item);
    setStoryTitle(item.class);
    setStoryText(null);
    setStoryError(null);

    if (!item.atlas_page_link) {
      setStoryError(
        'No hay artículo de enciclopedia asociado a este diagnóstico.',
      );
      return;
    }

    setStoryLoading(true);
    try {
      const entry = await encyclopediaService.getByUrl(item.atlas_page_link);
      if (!entry?.content) {
        setStoryError(
          'La historia de la enfermedad aún no está disponible. Inténtalo en unos minutos.',
        );
        return;
      }
      setStoryTitle(entry.title ?? item.class);
      setStoryText(stripHtml(entry.content));
    } catch (err) {
      setStoryError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la historia de la enfermedad.',
      );
    } finally {
      setStoryLoading(false);
    }
  }

  return (
    <View style={styles.skiniverBlock}>
      <SkiniverRiskGauge percent={gaugePercent} riskLabel={String(riskLabel)} />

      {top ? (
        <Pressable
          style={styles.topDiagnosisCard}
          onPress={() => openDiagnosis(top as SkiniverDiagnosisCandidate)}
        >
          <View
            style={[
              styles.diagnosisRing,
              {
                borderColor:
                  RISK_COLORS[
                    (top as SkiniverDiagnosisCandidate).risk_level ?? 'medium'
                  ] ?? RISK_COLORS.medium,
              },
            ]}
          >
            <Text style={styles.diagnosisProb}>
              {conclusionProb != null ? String(conclusionProb).replace('.', ',') : '—'}
            </Text>
          </View>
          <View style={styles.diagnosisBody}>
            <Text style={styles.diagnosisTitle}>{top.class}</Text>
            {(top as SkiniverDiagnosisCandidate).desease ? (
              <Text style={styles.diagnosisSub}>
                {(top as SkiniverDiagnosisCandidate).desease}
              </Text>
            ) : null}
          </View>
          <AppIcon icon={Icons.chevronRight} size={20} color={branding.colors.primary} />
        </Pressable>
      ) : null}

      <AnalysisImageCarousel
        images={[
          { label: 'Original', url: analysis.imageUrl },
          { label: 'Coloreada', url: analysis.coloredUrl },
          { label: 'Máscara', url: analysis.maskedUrl },
        ]}
      />

      <View
        style={[
          styles.riskBanner,
          { backgroundColor: banner.bg, borderColor: banner.border },
        ]}
      >
        <AppIcon icon={Icons.alertCircle} size={20} color={banner.text} />
        <Text style={[styles.riskBannerText, { color: banner.text }]}>
          Nivel de Riesgo: {riskLabel}
        </Text>
      </View>

      <View style={styles.conclusionBox}>
        <AppIcon icon={Icons.account} size={18} color={branding.colors.primary} />
        <Text style={styles.conclusionText}>
          Conclusión
          {conclusionProb != null ? `: ${conclusionProb}% ` : ': '}
          {conclusionLabel}
        </Text>
      </View>

      {analysis.bodyRegion ? (
        <View style={styles.metaRow}>
          <AppIcon icon={Icons.mapMarker} size={18} color={branding.colors.muted} />
          <Text style={styles.metaText}>
            Región del cuerpo: {analysis.bodyRegion}
          </Text>
        </View>
      ) : null}

      {topn.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Lee más sobre la enfermedad</Text>
          {topn.map((item, index) => (
            <DiagnosisCard
              key={`${item.class}-${index}`}
              item={item}
              styles={styles}
              onPress={() => openDiagnosis(item)}
            />
          ))}
        </>
      ) : null}

      <Text style={styles.disclaimer}>
        La IA solo cubre algunas enfermedades y es una ayuda diagnóstica. Consulta
        siempre a un dermatólogo.
      </Text>

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.storyModalBackdrop}>
          <View style={styles.storyModalCard}>
            <View style={styles.storyModalHeader}>
              <Text style={styles.storyModalTitle} numberOfLines={2}>
                {storyTitle ?? 'Historia'}
              </Text>
              <Pressable
                style={styles.roundBtn}
                onPress={() => setSelected(null)}
                accessibilityLabel="Cerrar"
              >
                <AppIcon
                  icon={Icons.close}
                  size={18}
                  color={branding.colors.muted}
                />
              </Pressable>
            </View>
            {selected ? (
              <Text style={styles.storyMeta}>
                Probabilidad:{' '}
                {Math.round(normalizedProb(selected.prob))}%
                {selected.desease ? ` — ${selected.desease}` : ''}
              </Text>
            ) : null}
            <ScrollView
              style={styles.storyScroll}
              contentContainerStyle={styles.storyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {storyLoading ? (
                <ActivityIndicator color={branding.colors.primary} />
              ) : storyError ? (
                <Text style={styles.note}>{storyError}</Text>
              ) : storyText ? (
                <Text style={styles.storyBody}>{storyText}</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
