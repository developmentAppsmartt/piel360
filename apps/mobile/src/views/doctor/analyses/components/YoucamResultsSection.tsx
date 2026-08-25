import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../../context/BrandingContext';
import {
  FITZPATRICK_TYPES,
  type FitzpatrickScale,
} from '../../../../data/fitzpatrickLabels';
import { PATIENT_FITZ_OPTIONS } from '../../../../data/patientFormOptions';
import { youcamMetricAdvice, youcamMetricCopy } from '../../../../data/youcamMetricCopy';
import { youcamMetricConvention, youcamViewerBadgeLabel } from '../../../../data/youcamMetricConventions';
import {
  YOUCAM_METRIC_LABELS,
  youcamRegionLabel,
  youcamSkinTypeLabel,
} from '../../../../data/youcamMetricLabels';
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
  youcamScoreBand,
  youcamSkinAge,
  youcamSkinType,
} from '../../../../types/analysis';
import { createYoucamResultsStyles } from '../styles/youcamResults.styles';
import { FitzpatrickResultsSection } from './FitzpatrickResultsSection';
import { YoucamCatalogSection } from './YoucamCatalogSection';
import { YoucamAcneConventionBar } from './YoucamAcneConventionBar';
import { YoucamMetricConventionBar } from './YoucamMetricConventionBar';
import { YoucamSkinTypeConventionBar } from './YoucamSkinTypeConventionBar';

/** Colores de respaldo si no hay fototipo Fitzpatrick. */
const SKIN_TYPE_SWATCH: Record<string, string> = {
  normal: '#C4B5A5',
  dry: '#93C5FD',
  oily: '#86EFAC',
  mixed: '#FCD34D',
  combination: '#FCD34D',
  redness: '#FCA5A5',
  'dry & redness': '#FDA4AF',
  'oily & redness': '#F9A8D4',
  'combination & redness': '#FDBA74',
};

type SkinTypeChipDisplay = {
  color: string;
  label: string;
  /** Texto largo para el resumen (p. ej. "Tipo VI · Negro"). */
  detail?: string;
};

function isFitzpatrickScale(value: string): value is FitzpatrickScale {
  return value in FITZPATRICK_TYPES;
}

/** Prioridad: Fitzpatrick del paciente → tipo YouCam → skinType del perfil. */
function resolveSkinTypeChip(
  analysis: AnalysisDetail,
  youcamType: string | null,
): SkinTypeChipDisplay | null {
  const fitz = analysis.patient?.fitzpatrickType?.trim();
  if (fitz && isFitzpatrickScale(fitz)) {
    const info = FITZPATRICK_TYPES[fitz];
    const option = PATIENT_FITZ_OPTIONS.find((o) => o.value === fitz);
    return {
      color: option?.color ?? info.colorHex,
      // Chip corto; el detalle va en el resumen / tarjeta (sin nombre de API).
      label: 'Fototipo',
      detail: `Tipo ${fitz} · ${info.label}`,
    };
  }

  const youcamKey = youcamType?.toLowerCase() ?? null;
  if (youcamKey) {
    return {
      color: SKIN_TYPE_SWATCH[youcamKey] ?? '#D1D5DB',
      label: youcamSkinTypeLabel(youcamKey),
    };
  }

  const profileSkin = analysis.patient?.skinType?.trim()?.toLowerCase();
  if (profileSkin) {
    return {
      color: SKIN_TYPE_SWATCH[profileSkin] ?? '#D1D5DB',
      label: youcamSkinTypeLabel(profileSkin),
    };
  }

  return null;
}

type YoucamResultsSectionProps = {
  analysis: AnalysisDetail;
  onOpenProgress: () => void;
  onOpenReport: () => void;
};

const MULTI_REGION_TYPES = new Set(['hd_wrinkle', 'hd_pore', 'hd_skin_type']);
const DEFAULT_REGION = 'whole';

const OVERVIEW_LAYER_TYPES = [
  'hd_dark_circle',
  'hd_firmness',
  'hd_redness',
  'hd_eye_bag',
  'hd_tear_trough',
  'hd_pore',
  'hd_age_spot',
  'hd_wrinkle',
];

type MetricRegionOption = {
  region: string;
  label: string;
  score: number | null;
  skinType: string | null;
  maskUrl: string | null;
};

type MetricChip = {
  type: string;
  label: string;
  score: number | null;
  maskUrl: string | null;
  regions?: MetricRegionOption[];
};

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 12) return full;
  return full.split(' ')[0] ?? full;
}

function normalizeRegion(region: string | undefined | null): string {
  if (!region || region === '') return DEFAULT_REGION;
  return region;
}

function findMaskUrl(
  masks: AnalysisDetail['masks'],
  type: string,
  region: string | undefined,
): string | null {
  const want = normalizeRegion(region);
  return (
    masks.find(
      (m) => m.type === type && normalizeRegion(m.region) === want,
    )?.url ?? null
  );
}

function buildRegionOptions(
  type: string,
  candidates: YoucamMetric[],
  masks: AnalysisDetail['masks'],
  preferRaw: boolean,
): MetricRegionOption[] {
  const sorted = [...candidates].sort((a, b) => {
    const aWhole = normalizeRegion(a.region) === DEFAULT_REGION;
    const bWhole = normalizeRegion(b.region) === DEFAULT_REGION;
    if (aWhole === bWhole) return 0;
    return aWhole ? -1 : 1;
  });
  return sorted.map((m) => {
    const region = normalizeRegion(m.region);
    return {
      region,
      label: youcamRegionLabel(region),
      score: youcamMetricValue(m, preferRaw),
      skinType: m.skinType,
      maskUrl: findMaskUrl(masks, type, region),
    };
  });
}

function buildChips(
  metrics: YoucamMetric[],
  masks: AnalysisDetail['masks'],
  preferRaw: boolean,
  skinTypeDisplay: SkinTypeChipDisplay | null,
): MetricChip[] {
  const chips: MetricChip[] = [
    {
      type: 'overview',
      label: 'Salud de la piel',
      score: youcamOverallScore(metrics),
      maskUrl: null,
    },
  ];

  const skinTypeCandidates = metrics.filter((m) => m.type === 'hd_skin_type');
  if (skinTypeCandidates.length > 0 || skinTypeDisplay) {
    const whole =
      skinTypeCandidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
      skinTypeCandidates[0];
    chips.push({
      type: 'hd_skin_type',
      label: skinTypeDisplay?.label ?? 'Tipo piel',
      score: whole ? youcamMetricValue(whole, preferRaw) : null,
      maskUrl: whole
        ? findMaskUrl(masks, 'hd_skin_type', whole.region)
        : null,
      regions:
        skinTypeCandidates.length > 1
          ? buildRegionOptions(
              'hd_skin_type',
              skinTypeCandidates,
              masks,
              preferRaw,
            )
          : undefined,
    });
  }

  for (const type of YOUCAM_MAIN_METRIC_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
      candidates[0];
    chips.push({
      type,
      label: shortLabel(type),
      score: youcamMetricValue(whole, preferRaw),
      maskUrl: findMaskUrl(masks, type, whole.region),
      regions:
        MULTI_REGION_TYPES.has(type) && candidates.length > 1
          ? buildRegionOptions(type, candidates, masks, preferRaw)
          : undefined,
    });
  }

  return chips;
}

function buildOverviewMaskUrls(
  metrics: YoucamMetric[],
  masks: AnalysisDetail['masks'],
): string[] {
  const urls: string[] = [];
  for (const type of OVERVIEW_LAYER_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => normalizeRegion(m.region) === DEFAULT_REGION) ??
      candidates[0];
    const url = findMaskUrl(masks, type, whole.region);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * En "General" de poros/arrugas Perfect apila las máscaras de cada zona
 * (frente, nariz, mejillas…). La máscara `whole` sola no basta.
 * Si eliges una región concreta, solo esa máscara.
 */
function resolveMetricMaskUrls(
  selected: MetricChip | null,
  selectedRegion: string,
  allMasks: AnalysisDetail['masks'],
): string[] {
  if (!selected || selected.type === 'overview') return [];

  const type = selected.type;
  const typeMasks = allMasks.filter((m) => m.type === type && !!m.url);
  const isMultiZone = type === 'hd_pore' || type === 'hd_wrinkle';
  const wantGeneral = normalizeRegion(selectedRegion) === DEFAULT_REGION;

  if (isMultiZone && wantGeneral) {
    // Todas las zonas (frente, nariz, mejillas, crowfeet, …) — sin `whole`,
    // que a menudo solo pinta mejillas y tapa el resto.
    const byRegion = new Map<string, string>();
    for (const m of typeMasks) {
      const region = normalizeRegion(m.region);
      if (region === DEFAULT_REGION) continue;
      if (!byRegion.has(region)) byRegion.set(region, m.url);
    }
    // También rellenar desde el chip por si el API omitió alguna máscara
    // en `masks` pero sí vino en regions[].maskUrl.
    for (const r of selected.regions ?? []) {
      const region = normalizeRegion(r.region);
      if (region === DEFAULT_REGION || !r.maskUrl) continue;
      if (!byRegion.has(region)) byRegion.set(region, r.maskUrl);
    }
    if (byRegion.size > 0) return [...byRegion.values()];
    const whole = typeMasks.find(
      (m) => normalizeRegion(m.region) === DEFAULT_REGION,
    );
    return whole ? [whole.url] : [];
  }

  const match = typeMasks.find(
    (m) => normalizeRegion(m.region) === normalizeRegion(selectedRegion),
  );
  if (match) return [match.url];

  const fromChip =
    selected.regions?.find((r) => r.region === selectedRegion)?.maskUrl ??
    selected.maskUrl;
  return fromChip ? [fromChip] : [];
}

function regionPillLabel(option: MetricRegionOption): string {
  if (option.skinType) {
    return `${option.label} · ${youcamSkinTypeLabel(option.skinType)}`;
  }
  if (option.score != null) return `${option.label} ${Math.round(option.score)}`;
  return option.label;
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
  const skinTypeChip = useMemo(
    () => resolveSkinTypeChip(analysis, skinType),
    [analysis, skinType],
  );
  const [preferRaw, setPreferRaw] = useState(false);
  const chips = useMemo(
    () => buildChips(metrics, analysis.masks, preferRaw, skinTypeChip),
    [metrics, analysis.masks, preferRaw, skinTypeChip],
  );
  const overviewMaskUrls = useMemo(
    () => buildOverviewMaskUrls(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const selected =
    chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;
  const activeRegion =
    selected?.regions?.find((r) => r.region === selectedRegion) ?? null;
  const isOverview = selected?.type === 'overview';
  const activeScore = activeRegion?.score ?? selected?.score ?? null;
  const activeRegionKey = activeRegion?.region ?? DEFAULT_REGION;
  const copyType = selected?.type ?? null;
  const baseCopy = youcamMetricCopy(
    copyType,
    selected?.regions?.length ? activeRegionKey : null,
  );
  const skinTypeHint =
    activeRegion?.skinType != null
      ? ` Resultado en esta zona: ${youcamSkinTypeLabel(activeRegion.skinType)}.`
      : '';
  const copyText = `${baseCopy}${skinTypeHint}`;
  const adviceText =
    activeScore != null && copyType && copyType !== 'overview'
      ? youcamMetricAdvice(
          copyType,
          youcamScoreBand(activeScore),
          activeRegion && activeRegion.region !== DEFAULT_REGION
            ? activeRegion.label
            : null,
        )
      : null;

  const showBase = analysis.hasOriginalPhoto && !!analysis.imageUrl;
  const metricMaskUrls = useMemo(
    () => resolveMetricMaskUrls(selected, selectedRegion, analysis.masks),
    [selected, selectedRegion, analysis.masks],
  );
  const badgeLabel =
    selected?.type === 'hd_skin_type'
      ? activeRegion && activeRegion.region !== DEFAULT_REGION
        ? `${selected.label} — ${activeRegion.label}`
        : selected.label
      : youcamViewerBadgeLabel(selected?.type);
  const showConvention =
    !!selected &&
    selected.type !== 'overview' &&
    selected.type !== 'hd_skin_type' &&
    selected.type !== 'hd_acne';
  const showSkinTypeConvention = selected?.type === 'hd_skin_type';
  const showAcneConvention = selected?.type === 'hd_acne';
  function selectChip(type: string) {
    setSelectedType(type);
    setSelectedRegion(DEFAULT_REGION);
  }
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
          <Text style={styles.summaryMuted}>
            {skinType ? youcamSkinTypeLabel(skinType) : '—'}
          </Text>
        </Text>
        {skinTypeChip?.detail ? (
          <Text style={styles.summaryLine}>
            Fototipo:{' '}
            <Text style={styles.summaryMuted}>{skinTypeChip.detail}</Text>
          </Text>
        ) : null}
      </View>

      <View style={styles.viewer}>
        {showBase ? (
          <>
            <Image
              source={{ uri: analysis.imageUrl! }}
              style={styles.viewerImage}
              contentFit="cover"
            />
            {isOverview
              ? overviewMaskUrls.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.viewerOverlay}
                    contentFit="cover"
                  />
                ))
              : metricMaskUrls.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.viewerOverlay}
                    contentFit="cover"
                  />
                ))}
          </>
        ) : metricMaskUrls.length > 0 ? (
          <>
            {metricMaskUrls.map((url, index) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={
                  index === 0 ? styles.viewerImage : styles.viewerOverlay
                }
                contentFit={index === 0 ? 'contain' : 'cover'}
              />
            ))}
          </>
        ) : (
          <View style={styles.viewerEmpty}>
            <Text style={styles.viewerEmptyText}>
              No hay foto original disponible para este análisis. Puedes revisar
              las métricas y el reporte.
            </Text>
          </View>
        )}
        {badgeLabel ? (
          <View
            style={[
              styles.viewerBadge,
              selected && selected.type !== 'overview'
                ? {
                    backgroundColor: youcamMetricConvention(selected.type)
                      .color,
                  }
                : null,
            ]}
          >
            <Text style={styles.viewerBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        {showConvention && selected ? (
          <YoucamMetricConventionBar
            metricType={selected.type}
            styles={styles}
          />
        ) : null}
        {showSkinTypeConvention ? (
          <YoucamSkinTypeConventionBar styles={styles} />
        ) : null}
        {showAcneConvention ? (
          <YoucamAcneConventionBar styles={styles} />
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={onOpenProgress}>
          <Text style={styles.actionBtnText}>Mi Progreso</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onOpenReport}>
          <Text style={styles.actionBtnText}>Ver reporte de piel</Text>
        </Pressable>
      </View>

      <View style={styles.scoreModeRow}>
        <Pressable
          style={[styles.scoreModeBtn, !preferRaw && styles.scoreModeBtnOn]}
          onPress={() => setPreferRaw(false)}
        >
          <Text
            style={[
              styles.scoreModeText,
              !preferRaw && styles.scoreModeTextOn,
            ]}
          >
            Puntuación ajustada
          </Text>
        </Pressable>
        <Pressable
          style={[styles.scoreModeBtn, preferRaw && styles.scoreModeBtnOn]}
          onPress={() => setPreferRaw(true)}
        >
          <Text
            style={[
              styles.scoreModeText,
              preferRaw && styles.scoreModeTextOn,
            ]}
          >
            Puntuación real
          </Text>
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
          const isSkinType = chip.type === 'hd_skin_type';
          const swatch = isSkinType ? skinTypeChip : null;
          const convention =
            chip.type !== 'overview' && !isSkinType
              ? youcamMetricConvention(chip.type)
              : null;
          return (
            <Pressable
              key={chip.type}
              style={styles.metricChip}
              onPress={() => selectChip(chip.type)}
            >
              <View
                style={[
                  styles.metricRing,
                  !swatch && !convention && active
                    ? styles.metricRingActive
                    : null,
                  swatch
                    ? {
                        backgroundColor: swatch.color,
                        borderColor: active
                          ? branding.colors.primary
                          : '#D1D5DB',
                      }
                    : null,
                  convention
                    ? {
                        backgroundColor: softColor(convention.color, active),
                        borderColor: active ? convention.color : '#D1D5DB',
                      }
                    : null,
                ]}
              >
                {swatch ? null : (
                  <Text
                    style={[
                      styles.metricRingScore,
                      convention && active
                        ? { color: convention.color }
                        : null,
                    ]}
                  >
                    {chip.score != null ? Math.round(chip.score) : '·'}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.metricChipLabel,
                  active && styles.metricChipLabelActive,
                  convention && active ? { color: convention.color } : null,
                ]}
                numberOfLines={2}
              >
                {swatch?.label ??
                  convention?.badgeLabel ??
                  chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected?.regions && selected.regions.length > 0 ? (
        <View style={styles.regionRow}>
          {selected.regions.map((option) => {
            const active = option.region === selectedRegion;
            return (
              <Pressable
                key={option.region}
                style={[styles.regionPill, active && styles.regionPillOn]}
                onPress={() => setSelectedRegion(option.region)}
              >
                <Text
                  style={[
                    styles.regionPillText,
                    active && styles.regionPillTextOn,
                  ]}
                >
                  {regionPillLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {selected?.type === 'hd_skin_type' ? (
        <FitzpatrickResultsSection analysis={analysis} silentIfEmpty compact />
      ) : null}

      <View style={styles.copyCard}>
        <Text style={styles.copyText}>{copyText}</Text>
        {adviceText ? (
          <Text style={[styles.copyText, { marginTop: 8 }]}>{adviceText}</Text>
        ) : null}
      </View>

      <YoucamCatalogSection styles={styles} />
    </View>
  );
}

function softColor(hex: string, active: boolean): string {
  if (!active) return '#FFFFFF';
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#FFFFFF';
  return `${hex}22`;
}
