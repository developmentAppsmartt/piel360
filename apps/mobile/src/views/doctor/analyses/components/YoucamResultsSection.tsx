import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../../context/BrandingContext';
import { youcamMetricCopy } from '../../../../data/youcamMetricCopy';
import { YOUCAM_METRIC_LABELS } from '../../../../data/youcamMetricLabels';
import type {
  AnalysisDetail,
  YoucamMetric,
  YoucamRawResponse,
} from '../../../../types/analysis';
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamMetricValue,
  youcamOverallScore,
  youcamSkinAge,
  youcamSkinType,
} from '../../../../types/analysis';
import { createYoucamResultsStyles } from '../styles/youcamResults.styles';

type YoucamResultsSectionProps = {
  analysis: AnalysisDetail;
  onOpenProgress: () => void;
  onOpenReport: () => void;
};

type MetricChip = {
  type: string;
  label: string;
  score: number | null;
  maskUrl: string | null;
};

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 12) return full;
  return full.split(' ')[0] ?? full;
}

function buildChips(
  metrics: YoucamMetric[],
  masks: AnalysisDetail['masks'],
): MetricChip[] {
  const byType = new Map<string, YoucamMetric>();
  for (const m of metrics) {
    if (!byType.has(m.type) || !m.region || m.region === 'whole') {
      byType.set(m.type, m);
    }
  }

  const chips: MetricChip[] = [
    {
      type: 'overview',
      label: 'Resumen',
      score: youcamOverallScore(metrics),
      maskUrl: null,
    },
  ];

  const skinType = byType.get('hd_skin_type');
  if (skinType) {
    chips.push({
      type: 'hd_skin_type',
      label: 'Tipo piel',
      score: youcamMetricValue(skinType),
      maskUrl:
        masks.find((x) => x.type === 'hd_skin_type')?.url ?? null,
    });
  }

  for (const type of YOUCAM_MAIN_METRIC_TYPES) {
    const metric = byType.get(type);
    if (!metric) continue;
    chips.push({
      type,
      label: shortLabel(type),
      score: youcamMetricValue(metric),
      maskUrl: masks.find((x) => x.type === type)?.url ?? null,
    });
  }

  return chips;
}

export function YoucamResultsSection({
  analysis,
  onOpenProgress,
  onOpenReport,
}: YoucamResultsSectionProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamResultsStyles(branding.colors),
    [branding.colors],
  );

  const metrics = useMemo(
    () =>
      parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
    [analysis.aiRawResponse],
  );
  const overall = youcamOverallScore(metrics);
  const skinAge = youcamSkinAge(metrics);
  const skinType = youcamSkinType(metrics);
  const chips = useMemo(
    () => buildChips(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState('overview');
  const selected =
    chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;

  const showBase =
    analysis.hasOriginalPhoto && !!analysis.imageUrl;
  const maskUrl =
    selected?.type === 'overview' ? null : selected?.maskUrl ?? null;

  return (
    <View style={styles.block}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLine}>
          Salud de la piel (años):{' '}
          <Text style={styles.summaryMuted}>
            {skinAge != null ? Math.round(skinAge) : '—'}
          </Text>
        </Text>
        <Text style={styles.summaryLine}>
          Puntaje de la piel:{' '}
          <Text style={styles.summaryMuted}>
            {overall != null ? Math.round(overall) : '—'}
          </Text>
        </Text>
        {overall != null ? (
          <View style={styles.scoreBarTrack}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${Math.max(0, Math.min(100, overall))}%` },
              ]}
            />
          </View>
        ) : null}
        <Text style={styles.summaryLine}>
          Tipo de piel:{' '}
          <Text style={styles.summaryMuted}>{skinType ?? '—'}</Text>
        </Text>
      </View>

      <View style={styles.viewer}>
        {showBase ? (
          <>
            <Image
              source={{ uri: analysis.imageUrl! }}
              style={styles.viewerImage}
              contentFit="cover"
            />
            {maskUrl ? (
              <Image
                source={{ uri: maskUrl }}
                style={styles.viewerOverlay}
                contentFit="cover"
              />
            ) : null}
          </>
        ) : maskUrl ? (
          <Image
            source={{ uri: maskUrl }}
            style={styles.viewerImage}
            contentFit="contain"
          />
        ) : (
          <View style={styles.viewerEmpty}>
            <Text style={styles.viewerEmptyText}>
              No hay foto original disponible para este análisis. Puedes revisar
              las métricas y el reporte.
            </Text>
          </View>
        )}
        {selected && selected.type !== 'overview' ? (
          <View style={styles.viewerBadge}>
            <Text style={styles.viewerBadgeText}>{selected.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={onOpenProgress}>
          <Text style={styles.actionBtnText}>Mi Progreso</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onOpenReport}>
          <Text style={styles.actionBtnText}>Reportes</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.metricScroll}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {chips.map((chip) => {
          const active = chip.type === selected?.type;
          return (
            <Pressable
              key={chip.type}
              style={styles.metricChip}
              onPress={() => setSelectedType(chip.type)}
            >
              <View
                style={[styles.metricRing, active && styles.metricRingActive]}
              >
                <Text style={styles.metricRingScore}>
                  {chip.score != null ? Math.round(chip.score) : '·'}
                </Text>
              </View>
              <Text
                style={[
                  styles.metricChipLabel,
                  active && styles.metricChipLabelActive,
                ]}
                numberOfLines={2}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.copyCard}>
        <Text style={styles.copyText}>
          {youcamMetricCopy(selected?.type)}
        </Text>
      </View>
    </View>
  );
}
