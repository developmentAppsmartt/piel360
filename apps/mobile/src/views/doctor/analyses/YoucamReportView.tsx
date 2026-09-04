import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import {
  youcamMetricAdvice,
} from '../../../data/youcamMetricCopy';
import {
  YOUCAM_METRIC_LABELS,
  youcamMetricLabel,
  youcamSkinTypeLabel,
} from '../../../data/youcamMetricLabels';
import {
  chronologicalAgeYears,
  formatSignedYears,
  skinAgeDifference,
  skinAgeDifferenceMessage,
} from '../../../data/skinAge';
import { analysesService } from '../../../services/analyses.service';
import { ApiError } from '../../../services/api.client';
import { confirmAction } from '../../../utils/confirm';
import type {
  AnalysisDetail,
  YoucamRawResponse,
} from '../../../types/analysis';
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamMetricValue,
  youcamOverallScore,
  youcamScoreBand,
  youcamScoreBandLabel,
  youcamScoresByType,
  youcamSkinAge,
  youcamSkinType,
} from '../../../types/analysis';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { FitzpatrickResultsSection } from './components/FitzpatrickResultsSection';
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
  skinTypeLabel: string | null,
): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => YOUCAM_METRIC_LABELS[type] ?? type);

  const typeHint = skinTypeLabel
    ? ` Tu tipo de piel es ${skinTypeLabel.toLowerCase()}.`
    : '';

  if (overall != null && overall >= 90) {
    return `Ya vas camino a una gran piel.${typeHint} Mantén tu rutina y protección solar diaria. Revisa el detalle de cada métrica abajo.`;
  }
  if (overall != null && overall >= 70) {
    return `Vas en el promedio.${typeHint}${
      lows.length
        ? ` Un poco más de cuidado en ${lows.join(', ')} puede marcar la diferencia.`
        : ''
    } Revisa el análisis completo abajo.`;
  }
  if (lows.length === 0) {
    return `Hay margen de mejora general.${typeHint} Prioriza hidratación, SPF y una rutina constante.`;
  }
  return `Prioriza mejorar: ${lows.join(', ')}.${typeHint} Considera hidratación, protección solar y seguimiento dermatológico si persisten las molestias.`;
}

function findMaskUrl(
  masks: AnalysisDetail['masks'],
  type: string,
  region: string | undefined,
): string | null {
  return (
    masks.find((m) => m.type === type && m.region === (region ?? 'whole'))
      ?.url ??
    masks.find((m) => m.type === type)?.url ??
    null
  );
}

type ReportMetricRow = {
  key: string;
  type: string;
  region?: string;
  title: string;
  score: number;
  maskUrl: string | null;
};

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
  // Puntuación ajustada (uiScore): la elige el doctor; sin toggle en el análisis.
  const preferRaw = false;
  const scores = useMemo(
    () => youcamScoresByType(metrics, preferRaw),
    [metrics],
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
  const skinTypeLabel = skinType ? youcamSkinTypeLabel(skinType) : null;
  const band = overall != null ? youcamScoreBand(overall) : null;
  const name =
    patientName ??
    (analysis.patient
      ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim()
      : 'Paciente');

  const reportRows = useMemo((): ReportMetricRow[] => {
    const rows: ReportMetricRow[] = [];
    const seen = new Set<string>();

    for (const type of YOUCAM_MAIN_METRIC_TYPES) {
      const candidates = metrics.filter((m) => m.type === type);
      const whole =
        candidates.find((m) => !m.region || m.region === 'whole') ??
        candidates[0];
      if (!whole) continue;
      const score = youcamMetricValue(whole, preferRaw);
      if (score == null) continue;
      const key = `${type}:${whole.region ?? 'whole'}`;
      seen.add(key);
      rows.push({
        key,
        type,
        region: whole.region,
        title: youcamMetricLabel(type, whole.region),
        score,
        maskUrl: findMaskUrl(analysis.masks, type, whole.region),
      });

      for (const m of candidates) {
        if (!m.region || m.region === 'whole') continue;
        const subScore = youcamMetricValue(m, preferRaw);
        if (subScore == null) continue;
        const subKey = `${type}:${m.region}`;
        if (seen.has(subKey)) continue;
        seen.add(subKey);
        rows.push({
          key: subKey,
          type,
          region: m.region,
          title: youcamMetricLabel(type, m.region),
          score: subScore,
          maskUrl: findMaskUrl(analysis.masks, type, m.region),
        });
      }
    }

    return rows;
  }, [metrics, preferRaw, analysis.masks]);

  async function handleShareToggle() {
    if (!canShare) return;
    if (analysis.sharedWithPatient) {
      const ok = await confirmAction({
        title: 'Dejar de compartir',
        message:
          'El paciente dejará de ver este análisis en su app. ¿Continuar?',
        confirmLabel: 'Dejar de compartir',
        destructive: true,
      });
      if (!ok) return;
      try {
        const updated = await analysesService.unshareWithPatient(analysis.id);
        onShared?.(updated);
      } catch (err) {
        Alert.alert(
          'No se pudo dejar de compartir',
          err instanceof ApiError
            ? err.message
            : 'Inténtalo de nuevo en unos segundos.',
        );
      }
      return;
    }
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
              <Pressable
                style={styles.reportActionBtn}
                onPress={handleShareToggle}
                accessibilityLabel={
                  analysis.sharedWithPatient
                    ? 'Dejar de compartir'
                    : 'Compartir análisis'
                }
              >
                <AppIcon
                  icon={
                    analysis.sharedWithPatient ? Icons.eyeOff : Icons.share
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
              Tipo de piel:{' '}
              {skinTypeLabel ?? '—'}
            </Text>
            {analysis.patient?.fitzpatrickType ? (
              <Text style={styles.reportMetaText}>
                Piel: Tipo {analysis.patient.fitzpatrickType}
              </Text>
            ) : null}
            <Text style={styles.reportMetaText}>
              Puntuación de la piel:{' '}
              {overall != null ? Math.round(overall) : '—'}
            </Text>
            <Text style={styles.reportMetaText}>
              Edad de tu piel:{' '}
              {skinAge != null ? `${Math.round(skinAge)} años` : '—'}
            </Text>
            <Text style={styles.reportMetaMuted}>
              Edad cronológica:{' '}
              {chronologicalAge != null ? `${chronologicalAge} años` : '—'}
            </Text>
            {ageDiff != null ? (
              <>
                <Text
                  style={[
                    styles.reportMetaText,
                    ageDiff < 0
                      ? styles.summaryPositive
                      : ageDiff > 0
                        ? styles.summaryAged
                        : styles.summaryNeutral,
                  ]}
                >
                  Diferencia: {formatSignedYears(ageDiff)}
                </Text>
                <Text
                  style={[
                    styles.summaryMessage,
                    ageDiff < 0
                      ? styles.summaryPositive
                      : ageDiff > 0
                        ? styles.summaryAged
                        : styles.summaryNeutral,
                  ]}
                >
                  {skinAgeDifferenceMessage(ageDiff)}
                </Text>
              </>
            ) : null}
            {band ? (
              <Text style={styles.bandLabel}>
                Su piel está en el {youcamScoreBandLabel(band).toLowerCase()}
              </Text>
            ) : null}
          </View>

          {analysis.patient?.fitzpatrickType ? (
            <FitzpatrickResultsSection analysis={analysis} silentIfEmpty compact />
          ) : null}

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
              {buildSummary(scores, overall, skinTypeLabel)}
            </Text>
          </View>

          <View style={styles.radarWrap}>
            <RadarChart scores={scores} color={branding.colors.primary} />
          </View>

          <Text style={styles.sectionHeading}>Detalle por métrica</Text>

          <View style={styles.metricList}>
            {reportRows.map((row) => {
              const itemBand = youcamScoreBand(row.score);
              const color = BAND_COLOR[itemBand];
              const advice = youcamMetricAdvice(row.type, itemBand);

              return (
                <View key={row.key} style={styles.metricRowCard}>
                  <View style={styles.metricRowTop}>
                    <View style={styles.metricRowThumbWrap}>
                      {analysis.imageUrl ? (
                        <Image
                          source={{ uri: analysis.imageUrl }}
                          style={styles.metricRowThumb}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.metricRowThumbEmpty}>
                          <AppIcon
                            icon={Icons.camera}
                            size={22}
                            color={branding.colors.muted}
                          />
                        </View>
                      )}
                      {row.maskUrl ? (
                        <Image
                          source={{ uri: row.maskUrl }}
                          style={[
                            styles.metricRowThumb,
                            StyleSheet.absoluteFill,
                          ]}
                          contentFit="cover"
                        />
                      ) : null}
                    </View>

                    <View style={styles.metricRowBody}>
                      <View style={styles.metricRowHeader}>
                        <Text style={styles.metricRowTitle} numberOfLines={2}>
                          {row.title}
                        </Text>
                        <Text style={[styles.metricRowBand, { color }]}>
                          {youcamScoreBandLabel(itemBand)}
                        </Text>
                      </View>

                      <View style={styles.metricRowScoreRow}>
                        <View
                          style={[styles.metricRowPin, { backgroundColor: color }]}
                        >
                          <Text style={styles.metricRowPinText}>
                            {Math.round(row.score)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metricCardTrack}>
                        <View
                          style={[
                            styles.metricCardFill,
                            {
                              width: `${Math.max(0, Math.min(100, row.score))}%`,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.metricRowScale}>
                        <Text style={styles.metricRowScaleText}>0</Text>
                        <Text style={styles.metricRowScaleText}>70</Text>
                        <Text style={styles.metricRowScaleText}>90</Text>
                        <Text style={styles.metricRowScaleText}>100</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.metricAdviceBox}>
                    <Text style={styles.metricAdviceText}>{advice}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
