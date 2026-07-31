import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { YOUCAM_METRIC_LABELS } from '../../../data/youcamMetricLabels';
import { analysesService } from '../../../services/analyses.service';
import { ApiError } from '../../../services/api.client';
import type {
  AnalysisDetail,
  YoucamRawResponse,
} from '../../../types/analysis';
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamOverallScore,
  youcamScoreBand,
  youcamScoreBandLabel,
  youcamScoresByType,
  youcamSkinAge,
  youcamSkinType,
} from '../../../types/analysis';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createYoucamResultsStyles } from './styles/youcamResults.styles';

const RADAR_TYPES = [
  'hd_moisture',
  'hd_oiliness',
  'hd_firmness',
  'hd_age_spot',
  'hd_wrinkle',
  'hd_texture',
  'hd_pore',
  'hd_acne',
] as const;

const BAND_COLOR = {
  regular: '#F59E0B',
  promedio: '#3B82F6',
  buena: '#22C55E',
} as const;

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

function buildSummary(
  scores: Record<string, number>,
  overall: number | null,
): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => YOUCAM_METRIC_LABELS[type] ?? type);

  if (overall != null && overall >= 90) {
    return 'Su piel está en buen estado general. Mantén tu rutina de cuidado y protección solar diaria.';
  }
  if (lows.length === 0) {
    return 'Su piel está en el promedio. Revisa las zonas detalladas abajo para priorizar tu rutina.';
  }
  return `Prioriza mejorar: ${lows.join(', ')}. Considera hidratación adecuada, protección solar y consulta dermatológica si persisten las molestias.`;
}

function RadarChart({
  scores,
  color,
}: {
  scores: Record<string, number>;
  color: string;
}) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  const axes = RADAR_TYPES.filter((t) => scores[t] != null);
  if (axes.length < 3) return null;

  const points = axes.map((type, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const value = Math.max(0, Math.min(100, scores[type] ?? 0)) / 100;
    return {
      type,
      value: scores[type] ?? 0,
      x: cx + Math.cos(angle) * radius * value,
      y: cy + Math.sin(angle) * radius * value,
      lx: cx + Math.cos(angle) * (radius + 18),
      ly: cy + Math.sin(angle) * (radius + 18),
      ax: cx + Math.cos(angle) * radius,
      ay: cy + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <Circle
          key={ring}
          cx={cx}
          cy={cy}
          r={radius * ring}
          stroke="#E5E7EB"
          strokeWidth={1}
          fill="none"
        />
      ))}
      {points.map((p) => (
        <Line
          key={p.type}
          x1={cx}
          y1={cy}
          x2={p.ax}
          y2={p.ay}
          stroke="#E5E7EB"
          strokeWidth={1}
        />
      ))}
      <Polygon
        points={polygon}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={2}
      />
      {points.map((p) => (
        <SvgText
          key={`t-${p.type}`}
          x={p.lx}
          y={p.ly}
          fill="#374151"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {Math.round(p.value)}
        </SvgText>
      ))}
    </Svg>
  );
}

type YoucamReportViewProps = {
  analysis: AnalysisDetail;
  patientName?: string;
  canShare?: boolean;
  onShared?: (updated: AnalysisDetail) => void;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

export function YoucamReportView({
  analysis,
  patientName,
  canShare,
  onShared,
  onBack,
  onOpenMenu,
  onOpenMessages,
}: YoucamReportViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createYoucamResultsStyles(branding.colors),
    [branding.colors],
  );

  const metrics = useMemo(
    () =>
      parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
    [analysis.aiRawResponse],
  );
  const scores = useMemo(() => youcamScoresByType(metrics), [metrics]);
  const overall = youcamOverallScore(metrics);
  const skinAge = youcamSkinAge(metrics);
  const skinType = youcamSkinType(metrics);
  const band = overall != null ? youcamScoreBand(overall) : null;
  const name =
    patientName ??
    (analysis.patient
      ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim()
      : 'Paciente');

  const gridTypes = useMemo(() => {
    const types = new Set<string>([...YOUCAM_MAIN_METRIC_TYPES]);
    for (const key of Object.keys(scores)) {
      if (
        key !== 'all' &&
        key !== 'skin_age' &&
        key !== 'resize_image' &&
        key !== 'hd_skin_type'
      ) {
        types.add(key);
      }
    }
    return [...types].filter((t) => scores[t] != null);
  }, [scores]);

  async function handleShare() {
    if (!canShare || analysis.sharedWithPatient) return;
    try {
      const updated = await analysesService.shareWithPatient(analysis.id);
      onShared?.(updated);
      Alert.alert(
        'Análisis compartido',
        'El paciente ya puede verlo en el histórico de su inicio.',
      );
    } catch (err) {
      Alert.alert(
        'No se pudo compartir',
        err instanceof ApiError
          ? err.message
          : 'Inténtalo de nuevo en unos segundos.',
      );
    }
  }

  return (
    <View style={styles.progressScreen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        messageCount={1}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
      <View style={styles.progressCard}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Pressable onPress={onBack} hitSlop={8}>
            <AppIcon
              icon={Icons.back}
              size={24}
              color={branding.colors.muted}
            />
          </Pressable>
          <View style={styles.reportActions}>
            <Pressable
              style={styles.reportActionBtn}
              onPress={() =>
                Alert.alert(
                  'Descargar',
                  'La descarga del reporte se conectará próximamente.',
                )
              }
            >
              <AppIcon
                icon={Icons.download}
                size={18}
                color={branding.colors.muted}
              />
            </Pressable>
            <Pressable
              style={styles.reportActionBtn}
              onPress={() =>
                Alert.alert(
                  'PDF',
                  'La exportación a PDF se conectará próximamente.',
                )
              }
            >
              <AppIcon
                icon={Icons.file}
                size={18}
                color={branding.colors.muted}
              />
            </Pressable>
            {canShare ? (
              <Pressable style={styles.reportActionBtn} onPress={handleShare}>
                <AppIcon
                  icon={
                    analysis.sharedWithPatient ? Icons.check : Icons.share
                  }
                  size={18}
                  color={
                    analysis.sharedWithPatient
                      ? branding.colors.success
                      : branding.colors.muted
                  }
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.reportTitle}>Reporte Salud de la Piel</Text>

          <View style={styles.reportHeader}>
            <View style={styles.reportAvatar}>
              {analysis.hasOriginalPhoto && analysis.imageUrl ? (
                <Image
                  source={{ uri: analysis.imageUrl }}
                  style={styles.reportAvatarImg}
                  contentFit="cover"
                />
              ) : (
                <AppIcon
                  icon={Icons.account}
                  size={32}
                  color={branding.colors.primary}
                />
              )}
            </View>
            <View style={styles.reportMeta}>
              <Text style={styles.reportMetaText}>Paciente: {name}</Text>
              <Text style={styles.reportMetaMuted}>
                {formatStamp(analysis.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.reportStats}>
            <Text style={styles.reportMetaText}>
              Tipo de piel: {skinType ?? '—'}
            </Text>
            <Text style={styles.reportMetaText}>
              Puntuación de la piel:{' '}
              {overall != null ? Math.round(overall) : '—'}
            </Text>
            <Text style={styles.reportMetaText}>
              Edad de tu piel: {skinAge != null ? Math.round(skinAge) : '—'}
            </Text>
            {band ? (
              <Text style={styles.bandLabel}>
                Su piel está en el {youcamScoreBandLabel(band).toLowerCase()}
              </Text>
            ) : null}
          </View>

          {overall != null ? (
            <>
              <View style={styles.rangeTrack}>
                <View
                  style={[styles.rangeSeg, { flex: 70, backgroundColor: '#F59E0B' }]}
                />
                <View
                  style={[styles.rangeSeg, { flex: 20, backgroundColor: '#3B82F6' }]}
                />
                <View
                  style={[styles.rangeSeg, { flex: 10, backgroundColor: '#22C55E' }]}
                />
              </View>
              <View style={styles.rangeMarkerWrap}>
                <View
                  style={[
                    styles.rangeMarker,
                    { left: `${Math.max(0, Math.min(100, overall))}%` },
                  ]}
                >
                  <Text style={styles.rangeMarkerText}>
                    {Math.round(overall)}
                  </Text>
                </View>
              </View>
              <View style={styles.rangeLabels}>
                <Text style={[styles.rangeLabel, { color: '#F59E0B' }]}>
                  Regular
                </Text>
                <Text style={[styles.rangeLabel, { color: '#3B82F6' }]}>
                  Promedio
                </Text>
                <Text style={[styles.rangeLabel, { color: '#22C55E' }]}>
                  Buena
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>RESUMEN</Text>
            <Text style={styles.summaryBody}>
              {buildSummary(scores, overall)}
            </Text>
          </View>

          <View style={styles.radarWrap}>
            <RadarChart scores={scores} color={branding.colors.primary} />
          </View>

          <View style={styles.metricGrid}>
            {gridTypes.map((type) => {
              const score = scores[type] ?? 0;
              const itemBand = youcamScoreBand(score);
              const color = BAND_COLOR[itemBand];
              return (
                <View key={type} style={styles.metricCard}>
                  <Text style={styles.metricCardTitle} numberOfLines={2}>
                    {YOUCAM_METRIC_LABELS[type] ?? type}
                  </Text>
                  <Text style={[styles.metricCardBand, { color }]}>
                    {youcamScoreBandLabel(itemBand)}
                  </Text>
                  <View style={styles.metricCardTrack}>
                    <View
                      style={[
                        styles.metricCardFill,
                        {
                          width: `${Math.max(0, Math.min(100, score))}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricCardScore}>
                    {Math.round(score)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
