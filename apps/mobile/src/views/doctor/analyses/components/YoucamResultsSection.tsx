import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { useDeviceLayout } from '../../../../styles/deviceLayout';
import {
  FITZPATRICK_TYPES,
  type FitzpatrickScale,
} from '../../../../data/fitzpatrickLabels';
import { PATIENT_FITZ_OPTIONS } from '../../../../data/patientFormOptions';
import { youcamMetricAdvice, youcamMetricCopy } from '../../../../data/youcamMetricCopy';
import { youcamMetricConvention, youcamViewerBadgeLabel } from '../../../../data/youcamMetricConventions';
import {
  formatSignedYears,
  chronologicalAgeYears,
  skinAgeDifference,
  skinAgeDifferenceMessage,
} from '../../../../data/skinAge';
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

const SKIN_ZONE_COPY: Record<string, { title: string; subtitle?: string }> = {
  t_zone: {
    title: 'Zona T',
    subtitle: 'Frente, nariz y mentón',
  },
  u_zone: {
    title: 'Zona U',
    subtitle: 'Mejillas y contorno facial',
  },
  whole: {
    title: 'Cara completa',
  },
};

const COLLAPSIBLE_TYPES = new Set([
  'hd_skin_type',
  'fitzpatrick',
  'hd_wrinkle',
  'hd_pore',
]);
const PHOTOTYPE_TYPE = 'fitzpatrick';
const BIOTIPO_RING = { backgroundColor: '#E7F4E4', borderColor: '#1E3A5F' };
const FOTOTIPO_RING = { backgroundColor: '#F6E4D4', borderColor: '#8B7BB8' };
const DEFAULT_REGION = 'whole';
const MIN_IMAGE_ZOOM = 1;
const MAX_IMAGE_ZOOM = 2.5;
const IMAGE_ZOOM_STEP = 0.25;
const ZERO_PAN = { x: 0, y: 0 };

function clampImagePan(
  pan: { x: number; y: number },
  zoom: number,
  width: number,
  height: number,
) {
  if (zoom <= MIN_IMAGE_ZOOM || width <= 0 || height <= 0) return ZERO_PAN;
  const maxX = (width * zoom - width) / 2;
  const maxY = (height * zoom - height) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

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

function ensureWholeRegion(
  options: MetricRegionOption[],
  fallback: Omit<MetricRegionOption, 'region' | 'label'>,
): MetricRegionOption[] {
  const rest = options.filter((o) => o.region !== DEFAULT_REGION);
  const existing = options.find((o) => o.region === DEFAULT_REGION);
  const whole: MetricRegionOption = existing
    ? { ...existing, label: 'Cara completa' }
    : {
        region: DEFAULT_REGION,
        label: 'Cara completa',
        score: fallback.score,
        skinType: fallback.skinType,
        maskUrl: fallback.maskUrl,
      };
  if (rest.some((o) => o.region === 't_zone' || o.region === 'u_zone')) {
    const t = rest.filter((o) => o.region === 't_zone');
    const u = rest.filter((o) => o.region === 'u_zone');
    const other = rest.filter(
      (o) => o.region !== 't_zone' && o.region !== 'u_zone',
    );
    return [...t, ...u, whole, ...other];
  }
  return [whole, ...rest];
}

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
  overallSkinType: string | null,
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
    const built = skinTypeCandidates.length
      ? buildRegionOptions(
          'hd_skin_type',
          skinTypeCandidates,
          masks,
          preferRaw,
        )
      : [];
    chips.push({
      type: 'hd_skin_type',
      label: 'Biotipo',
      score: whole ? youcamMetricValue(whole, preferRaw) : null,
      maskUrl: whole
        ? findMaskUrl(masks, 'hd_skin_type', whole.region)
        : null,
      regions: ensureWholeRegion(built, {
        score: whole ? youcamMetricValue(whole, preferRaw) : null,
        skinType: whole?.skinType ?? overallSkinType,
        maskUrl: whole
          ? findMaskUrl(masks, 'hd_skin_type', whole.region)
          : null,
      }),
    });
  }

  chips.push({
    type: PHOTOTYPE_TYPE,
    label: 'Fototipo',
    score: null,
    maskUrl: null,
  });

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
      regions: COLLAPSIBLE_TYPES.has(type)
        ? ensureWholeRegion(
            buildRegionOptions(type, candidates, masks, preferRaw),
            {
              score: youcamMetricValue(whole, preferRaw),
              skinType: whole.skinType,
              maskUrl: findMaskUrl(masks, type, whole.region),
            },
          )
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

export function YoucamResultsSection({
  analysis,
  onOpenProgress,
  onOpenReport,
}: YoucamResultsSectionProps) {
  const branding = useBranding();
  const { conventionScale } = useDeviceLayout();
  const styles = useMemo(
    () => createYoucamResultsStyles(branding.colors, conventionScale),
    [branding.colors, conventionScale],
  );

  const metrics = useMemo(
    () =>
      parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
    [analysis.aiRawResponse],
  );
  const overall = youcamOverallScore(metrics);
  const skinAge = analysis.skinAgeYears ?? youcamSkinAge(metrics);
  const chronologicalAge =
    analysis.chronologicalAgeYears ??
    chronologicalAgeYears(analysis.patient?.birthDate, analysis.createdAt);
  const ageDiff =
    analysis.skinAgeDifference ??
    skinAgeDifference(skinAge, chronologicalAge);
  const skinType = youcamSkinType(metrics);
  const skinTypeChip = useMemo(
    () => resolveSkinTypeChip(analysis, skinType),
    [analysis, skinType],
  );
  // Puntuación ajustada (uiScore): la elige el doctor; el paciente no cambia modo.
  const preferRaw = false;
  const chips = useMemo(
    () =>
      buildChips(
        metrics,
        analysis.masks,
        preferRaw,
        skinTypeChip,
        skinType,
      ),
    [metrics, analysis.masks, skinTypeChip, skinType],
  );
  const overviewMaskUrls = useMemo(
    () => buildOverviewMaskUrls(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [panelOpen, setPanelOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(MIN_IMAGE_ZOOM);
  const [imagePan, setImagePan] = useState(ZERO_PAN);
  const viewerSize = useRef({ width: 0, height: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imageZoomRef = useRef(imageZoom);
  const imagePanRef = useRef(imagePan);
  imageZoomRef.current = imageZoom;
  imagePanRef.current = imagePan;

  const imagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          imageZoomRef.current > MIN_IMAGE_ZOOM &&
          (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          imageZoomRef.current > MIN_IMAGE_ZOOM &&
          (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
        onPanResponderGrant: (e) => {
          panStart.current = {
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
            panX: imagePanRef.current.x,
            panY: imagePanRef.current.y,
          };
        },
        onPanResponderMove: (e) => {
          if (imageZoomRef.current <= MIN_IMAGE_ZOOM) return;
          setImagePan(
            clampImagePan(
              {
                x:
                  panStart.current.panX +
                  (e.nativeEvent.pageX - panStart.current.x),
                y:
                  panStart.current.panY +
                  (e.nativeEvent.pageY - panStart.current.y),
              },
              imageZoomRef.current,
              viewerSize.current.width,
              viewerSize.current.height,
            ),
          );
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  function changeImageZoom(next: number) {
    const zoom = Math.min(
      MAX_IMAGE_ZOOM,
      Math.max(MIN_IMAGE_ZOOM, +next.toFixed(2)),
    );
    setImageZoom(zoom);
    setImagePan((pan) =>
      clampImagePan(
        zoom <= MIN_IMAGE_ZOOM ? ZERO_PAN : pan,
        zoom,
        viewerSize.current.width,
        viewerSize.current.height,
      ),
    );
  }
  const selected =
    chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;
  const activeRegion =
    selected?.regions?.find((r) => r.region === selectedRegion) ?? null;
  const isOverview = selected?.type === 'overview';
  const isFototipo = selected?.type === PHOTOTYPE_TYPE;
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
  const copyText = isFototipo
    ? skinTypeChip?.detail
      ? `Fototipo ${skinTypeChip.detail}. Describe cómo reacciona tu piel al sol (escala de Fitzpatrick).`
      : 'El fototipo describe cómo reacciona tu piel al sol según la escala de Fitzpatrick.'
    : `${baseCopy}${skinTypeHint}`;
  const adviceText =
    !isFototipo &&
    activeScore != null &&
    copyType &&
    copyType !== 'overview'
      ? youcamMetricAdvice(
          copyType,
          youcamScoreBand(activeScore),
          activeRegion && activeRegion.region !== DEFAULT_REGION
            ? activeRegion.label
            : null,
        )
      : null;

  const showBase = analysis.hasOriginalPhoto && !!analysis.imageUrl;
  const maskUrl = isOverview || isFototipo
    ? null
    : (activeRegion?.maskUrl ?? selected?.maskUrl ?? null);
  const badgeLabel =
    selected?.type === 'hd_skin_type'
      ? activeRegion && activeRegion.region !== DEFAULT_REGION
        ? `${selected.label} — ${activeRegion.label}`
        : selected.label
      : selected?.type === PHOTOTYPE_TYPE
        ? 'Fototipo'
        : youcamViewerBadgeLabel(selected?.type);
  const showConvention =
    !!selected &&
    selected.type !== 'overview' &&
    selected.type !== 'hd_skin_type' &&
    selected.type !== PHOTOTYPE_TYPE &&
    selected.type !== 'hd_acne';
  const showSkinTypeConvention = selected?.type === 'hd_skin_type';
  const showAcneConvention = selected?.type === 'hd_acne';
  function selectChip(type: string) {
    const collapsible = COLLAPSIBLE_TYPES.has(type);
    if (type === selectedType && collapsible) {
      setPanelOpen((open) => !open);
      return;
    }
    setSelectedType(type);
    setSelectedRegion(DEFAULT_REGION);
    setPanelOpen(collapsible);
  }
  const scorePct =
    overall != null ? Math.max(0, Math.min(100, overall)) : 0;
  const diffTone =
    ageDiff == null
      ? styles.summaryMuted
      : ageDiff < 0
        ? styles.summaryPositive
        : ageDiff > 0
          ? styles.summaryAged
          : styles.summaryNeutral;
  return (
    <View style={styles.block}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLine}>
          Salud de la piel (años):{' '}
          <Text style={styles.summaryAccent}>
            {skinAge != null ? `${Math.round(skinAge)} años` : '—'}
          </Text>
          <Text style={styles.summaryMuted}>
            {'  '}(Edad cronológica):{' '}
            {chronologicalAge != null ? `${chronologicalAge} años` : '—'}
          </Text>
        </Text>
        <Text style={styles.summaryLine}>
          Puntaje de la piel:{' '}
          <Text style={styles.summaryMuted}>
            {overall != null ? `${Math.round(overall)} / 100` : '—'}
          </Text>
        </Text>
        {overall != null ? (
          <View style={styles.scoreBarBlock}>
            <View style={styles.scoreBarLabels}>
              {scorePct < 96 ? (
                <Text
                  style={[
                    styles.scoreBarValue,
                    { left: `${scorePct}%` },
                  ]}
                >
                  {Math.round(overall)}
                </Text>
              ) : null}
              <Text style={styles.scoreBarMax}>100</Text>
            </View>
            <View style={styles.scoreBarTrack}>
              <View
                style={[
                  styles.scoreBarFill,
                  { width: `${scorePct}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
        {ageDiff != null ? (
          <>
            <Text style={[styles.summaryLine, diffTone]}>
              Diferencia: {formatSignedYears(ageDiff)}
            </Text>
            <Text style={[styles.summaryMessage, diffTone]}>
              {skinAgeDifferenceMessage(ageDiff)}
            </Text>
          </>
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

      <View
        style={styles.viewer}
        onLayout={(e) => {
          viewerSize.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        <View
          style={[
            styles.viewerZoomLayer,
            {
              transform: [
                { translateX: imagePan.x },
                { translateY: imagePan.y },
                { scale: imageZoom },
              ],
            },
          ]}
        >
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
                : maskUrl ? (
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
        </View>
        {showBase || maskUrl ? (
          <View
            collapsable={false}
            style={styles.viewerPanCatcher}
            {...imagePanResponder.panHandlers}
          />
        ) : null}
        {showBase || maskUrl ? (
          <View style={[styles.zoomControls, { pointerEvents: 'box-none' }]}>
            <Pressable
              style={[
                styles.zoomBtn,
                imageZoom >= MAX_IMAGE_ZOOM && styles.zoomBtnDisabled,
              ]}
              onPress={() => changeImageZoom(imageZoom + IMAGE_ZOOM_STEP)}
              disabled={imageZoom >= MAX_IMAGE_ZOOM}
              accessibilityLabel="Acercar imagen"
            >
              <Text style={styles.zoomBtnText}>+</Text>
            </Pressable>
            <Pressable
              style={[
                styles.zoomBtn,
                imageZoom <= MIN_IMAGE_ZOOM && styles.zoomBtnDisabled,
              ]}
              onPress={() => changeImageZoom(imageZoom - IMAGE_ZOOM_STEP)}
              disabled={imageZoom <= MIN_IMAGE_ZOOM}
              accessibilityLabel="Alejar imagen"
            >
              <Text style={styles.zoomBtnText}>−</Text>
            </Pressable>
          </View>
        ) : null}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.metricScroll}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {chips.map((chip) => {
          const active = chip.type === selected?.type;
          const isBiotipo = chip.type === 'hd_skin_type';
          const isFototipoChip = chip.type === PHOTOTYPE_TYPE;
          const collapsible = COLLAPSIBLE_TYPES.has(chip.type);
          const expanded = active && panelOpen && collapsible;
          const convention =
            chip.type !== 'overview' && !isBiotipo && !isFototipoChip
              ? youcamMetricConvention(chip.type)
              : null;
          const glyphRing = isBiotipo
            ? BIOTIPO_RING
            : isFototipoChip
              ? FOTOTIPO_RING
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
                  !glyphRing && !convention && active
                    ? styles.metricRingActive
                    : null,
                  glyphRing
                    ? {
                        backgroundColor: glyphRing.backgroundColor,
                        borderColor: active
                          ? branding.colors.primary
                          : glyphRing.borderColor,
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
                {isBiotipo ? (
                  <WaterDropGlyph />
                ) : isFototipoChip ? (
                  <SunGlyph />
                ) : (
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
                {isBiotipo
                  ? 'Biotipo'
                  : isFototipoChip
                    ? 'Fototipo'
                    : (convention?.badgeLabel ?? chip.label)}
              </Text>
              {collapsible ? (
                <View
                  style={[
                    styles.metricChipChevron,
                    { transform: [{ rotate: expanded ? '90deg' : '-90deg' }] },
                  ]}
                >
                  <AppIcon
                    icon={Icons.back}
                    size={14}
                    color={
                      active ? branding.colors.primary : branding.colors.muted
                    }
                  />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {selected?.type === PHOTOTYPE_TYPE && panelOpen ? (
        <View style={styles.zonePanel}>
          <Pressable
            style={styles.zonePanelHead}
            onPress={() => setPanelOpen(false)}
          >
            <Text style={styles.zonePanelTitle}>Fototipo</Text>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <AppIcon
                icon={Icons.back}
                size={18}
                color={branding.colors.primary}
              />
            </View>
          </Pressable>
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <FitzpatrickResultsSection analysis={analysis} silentIfEmpty compact />
          </View>
        </View>
      ) : null}

      {selected?.regions &&
      selected.regions.length > 0 &&
      panelOpen &&
      selected.type !== PHOTOTYPE_TYPE &&
      COLLAPSIBLE_TYPES.has(selected.type) ? (
        <View style={styles.zonePanel}>
          <Pressable
            style={styles.zonePanelHead}
            onPress={() => setPanelOpen(false)}
          >
            <Text style={styles.zonePanelTitle}>
              {selected.type === 'hd_skin_type'
                ? 'Tu tipo de piel por zonas'
                : selected.type === 'hd_wrinkle'
                  ? 'Arrugas por zonas'
                  : 'Poros por zonas'}
            </Text>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <AppIcon
                icon={Icons.back}
                size={18}
                color={branding.colors.primary}
              />
            </View>
          </Pressable>
          {selected.regions.map((option) => {
            const active = option.region === selectedRegion;
            const copy = SKIN_ZONE_COPY[option.region];
            const title =
              selected.type === 'hd_skin_type'
                ? (copy?.title ?? option.label)
                : option.label;
            const subtitle =
              selected.type === 'hd_skin_type' ? copy?.subtitle : undefined;
            const value =
              option.skinType != null
                ? youcamSkinTypeLabel(option.skinType)
                : option.score != null
                  ? String(Math.round(option.score))
                  : '—';
            const dotColor = option.skinType
              ? (SKIN_TYPE_SWATCH[option.skinType.toLowerCase()] ??
                branding.colors.primary)
              : branding.colors.primary;
            return (
              <Pressable
                key={option.region}
                style={[styles.zoneRow, active && styles.zoneRowOn]}
                onPress={() => setSelectedRegion(option.region)}
              >
                <View style={styles.zoneRowCopy}>
                  <Text style={styles.zoneRowTitle}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.zoneRowSub}>{subtitle}</Text>
                  ) : null}
                </View>
                <Text style={styles.zoneRowValue}>{value}</Text>
                <View
                  style={[styles.zoneDot, { backgroundColor: dotColor }]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.copyCard}>
        <AppIcon
          icon={Icons.information}
          size={18}
          color={branding.colors.primary}
        />
        <View style={styles.copyCardBody}>
          <Text style={styles.copyText}>{copyText}</Text>
          {adviceText ? (
            <Text style={styles.copyText}>{adviceText}</Text>
          ) : null}
        </View>
      </View>

      <YoucamCatalogSection
        styles={styles}
        analysisId={analysis.id}
        metricType={
          selected?.type &&
          selected.type !== 'overview' &&
          selected.type !== PHOTOTYPE_TYPE
            ? selected.type
            : null
        }
      />
    </View>
  );
}

function WaterDropGlyph({
  color = '#1E293B',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2C12 3.2 6.8 10.4 6.8 14.6a5.2 5.2 0 0010.4 0C17.2 10.4 12 3.2 12 3.2z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M16.2 9.4c1 1.6 1.5 3.1 1.5 4.6a4.3 4.3 0 01-6.2 3.8"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SunGlyph({
  color = '#1E293B',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.6" stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function softColor(hex: string, active: boolean): string {
  if (!active) return '#FFFFFF';
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#FFFFFF';
  return `${hex}22`;
}
