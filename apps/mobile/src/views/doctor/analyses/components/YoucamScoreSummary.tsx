import { Text, View, type DimensionValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import {
  formatSignedYears,
  skinAgeDifferenceMessage,
} from '../../../../data/skinAge';
import {
  rangosGenerales,
  type YoucamScoreConfig,
} from '../../../../data/youcamScoreConfig';
import type { YoucamScoreBand } from '../../../../types/analysis';
import { youcamScoreBandLabel } from '../../../../types/analysis';
import { youcamScoreSummaryStyles as styles } from '../styles/youcamScoreSummary.styles';

const BAND_COLOR = {
  regular: '#F59E0B',
  promedio: '#3B82F6',
  buena: '#22C55E',
} as const;

const GAUGE = 64;
const GAUGE_STROKE = 7;
const GAUGE_R = (GAUGE - GAUGE_STROKE) / 2;
const GAUGE_CIRC = Math.PI * GAUGE_R;

type YoucamScoreSummaryProps = {
  overall: number | null;
  skinAge: number | null;
  chronologicalAge: number | null;
  ageDiff: number | null;
  scoreConfig: YoucamScoreConfig;
  primaryColor: string;
};

function bandFromScore(
  score: number,
  regularMax: number,
  promedioMax: number,
): YoucamScoreBand {
  if (score < regularMax) return 'regular';
  if (score < promedioMax) return 'promedio';
  return 'buena';
}

function InsightText({
  score,
  band,
  ageDiff,
}: {
  score: number;
  band: YoucamScoreBand;
  ageDiff: number | null;
}) {
  const nivel = youcamScoreBandLabel(band).toLowerCase();
  const envejecimiento =
    ageDiff == null
      ? ''
      : ageDiff > 0
        ? ', con signos de envejecimiento moderado'
        : ageDiff < 0
          ? ', con un aspecto más juvenil'
          : '';
  return (
    <Text style={styles.insightText}>
      Tu piel tiene un puntaje de{' '}
      <Text style={styles.insightBold}>{Math.round(score)}/100</Text>, lo que
      indica un nivel <Text style={styles.insightBold}>{nivel}</Text> de salud
      {envejecimiento}.
    </Text>
  );
}

function TargetIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Path d="M12 3v3M21 12h-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function DiffGauge({
  ageDiff,
  color,
}: {
  ageDiff: number;
  color: string;
}) {
  const tone = ageDiff > 0 ? '#DC2626' : ageDiff < 0 ? '#059669' : color;
  const pct = Math.min(1, Math.abs(ageDiff) / 20);
  const filled = GAUGE_CIRC * pct;
  return (
    <View style={styles.gaugeWrap}>
      <Svg width={GAUGE} height={GAUGE / 2 + 4}>
        <Path
          d={`M ${GAUGE_STROKE / 2} ${GAUGE / 2} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${GAUGE - GAUGE_STROKE / 2} ${GAUGE / 2}`}
          stroke="#E2E8F0"
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${GAUGE_STROKE / 2} ${GAUGE / 2} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${GAUGE - GAUGE_STROKE / 2} ${GAUGE / 2}`}
          stroke={tone}
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${GAUGE_CIRC}`}
        />
      </Svg>
      <Text style={[styles.gaugeValue, { color: tone }]}>
        {formatSignedYears(ageDiff)}
      </Text>
    </View>
  );
}

function SummaryBar({
  score,
  regularMax,
  promedioMax,
}: {
  score: number;
  regularMax: number;
  promedioMax: number;
}) {
  const value = Math.max(0, Math.min(100, score));
  const left = `${value}%` as DimensionValue;
  return (
    <View style={styles.barBlock}>
      <View style={styles.markerRow}>
        <View style={[styles.marker, { left }]}>
          <Text style={styles.markerText}>{Math.round(value)}</Text>
          <View style={styles.markerTip} />
        </View>
        <Text style={styles.barMax}>100</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={{ flex: regularMax, backgroundColor: BAND_COLOR.regular }} />
        <View
          style={{
            flex: Math.max(0, promedioMax - regularMax),
            backgroundColor: BAND_COLOR.promedio,
          }}
        />
        <View
          style={{
            flex: Math.max(0, 100 - promedioMax),
            backgroundColor: BAND_COLOR.buena,
          }}
        />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: BAND_COLOR.regular, flex: regularMax }]}>
          Regular
        </Text>
        <Text
          style={[
            styles.barLabel,
            {
              color: BAND_COLOR.promedio,
              flex: Math.max(0, promedioMax - regularMax),
            },
          ]}
        >
          Promedio
        </Text>
        <Text
          style={[
            styles.barLabel,
            {
              color: BAND_COLOR.buena,
              flex: Math.max(0, 100 - promedioMax),
            },
          ]}
        >
          Buena
        </Text>
      </View>
    </View>
  );
}

/** Tres tarjetas + barra + insight, como en el diseño de resultado. */
export function YoucamScoreSummary({
  overall,
  skinAge,
  chronologicalAge,
  ageDiff,
  scoreConfig,
  primaryColor,
}: YoucamScoreSummaryProps) {
  if (overall == null && skinAge == null && ageDiff == null) return null;
  const ranges = rangosGenerales(scoreConfig);
  const band =
    overall != null
      ? bandFromScore(overall, ranges.regularMax, ranges.promedioMax)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={[styles.iconChip, { backgroundColor: `${primaryColor}18` }]}>
            <AppIcon icon={Icons.heartPulse} size={16} color={primaryColor} />
          </View>
          <Text style={styles.metricLabel}>Salud de la piel</Text>
          <Text style={[styles.metricValue, { color: primaryColor }]}>
            {skinAge != null ? `${Math.round(skinAge)} años` : '—'}
          </Text>
          <Text style={styles.metricHint}>
            Edad cronológica:{' '}
            {chronologicalAge != null ? `${chronologicalAge} años` : '—'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.iconChip, { backgroundColor: `${primaryColor}18` }]}>
            <TargetIcon color={primaryColor} />
          </View>
          <Text style={styles.metricLabel}>Puntaje de la piel</Text>
          <Text style={[styles.metricValue, { color: primaryColor }]}>
            {overall != null ? `${Math.round(overall)}/100` : '—'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          {ageDiff != null ? (
            <DiffGauge ageDiff={ageDiff} color={primaryColor} />
          ) : (
            <Text style={[styles.metricValue, { color: primaryColor }]}>—</Text>
          )}
          <Text style={styles.metricLabel}>Diferencia</Text>
          {ageDiff != null ? (
            <Text
              style={[
                styles.diffMessage,
                ageDiff > 0
                  ? styles.aged
                  : ageDiff < 0
                    ? styles.young
                    : styles.neutral,
              ]}
            >
              {skinAgeDifferenceMessage(ageDiff)}
            </Text>
          ) : null}
        </View>
      </View>

      {overall != null ? (
        <SummaryBar
          score={overall}
          regularMax={ranges.regularMax}
          promedioMax={ranges.promedioMax}
        />
      ) : null}

      {overall != null && band ? (
        <View style={styles.insight}>
          <Svg width={18} height={18} viewBox="0 0 24 24" style={styles.insightIcon}>
            <Path
              d="M9 21h6M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z"
              stroke={primaryColor}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <InsightText score={overall} band={band} ageDiff={ageDiff} />
        </View>
      ) : null}
    </View>
  );
}
