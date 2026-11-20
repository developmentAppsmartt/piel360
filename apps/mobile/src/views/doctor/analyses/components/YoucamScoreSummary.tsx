import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import {
  formatSignedYears,
  skinAgeDifferenceMessage,
} from '../../../../data/skinAge';
import {
  configuredYoucamAdvice,
  configuredYoucamScoreBand,
  rangosGenerales,
  YOUCAM_OVERALL_TYPE,
  type YoucamScoreConfig,
} from '../../../../data/youcamScoreConfig';
import { youcamScoreBandLabel } from '../../../../types/analysis';
import { ScoreRangeBar, SCORE_BAND_COLOR } from '../ScoreRangeBar';
import { youcamScoreSummaryStyles as styles } from '../styles/youcamScoreSummary.styles';

type YoucamScoreSummaryProps = {
  overall: number | null;
  skinAge: number | null;
  chronologicalAge: number | null;
  ageDiff: number | null;
  scoreConfig: YoucamScoreConfig;
  primaryColor: string;
};

const RING = 112;
const RING_R = 42;
const RING_STROKE = 9;
const RING_CIRC = 2 * Math.PI * RING_R;

function ScoreRing({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={styles.ringWrap}>
      <Svg width={RING} height={RING} viewBox="0 0 100 100">
        <Circle
          cx={50}
          cy={50}
          r={RING_R}
          stroke="#E2E8F0"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={50}
          cy={50}
          r={RING_R}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRC}`}
          strokeDashoffset={RING_CIRC * (1 - pct)}
          rotation={-90}
          origin="50, 50"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringScore}>{Math.round(score)}</Text>
        <Text style={styles.ringDenom}>/100</Text>
      </View>
    </View>
  );
}

function DiffBlock({ ageDiff }: { ageDiff: number }) {
  const aged = ageDiff > 0;
  const young = ageDiff < 0;
  return (
    <View style={styles.diffCol}>
      <View
        style={[
          styles.diffPill,
          aged
            ? styles.diffPillAged
            : young
              ? styles.diffPillYoung
              : styles.diffPillNeutral,
        ]}
      >
        <Text
          style={[
            styles.diffPillText,
            aged
              ? styles.diffAged
              : young
                ? styles.diffYoung
                : styles.diffNeutral,
          ]}
        >
          {aged ? '↑ ' : young ? '↓ ' : ''}
          Diferencia: {formatSignedYears(ageDiff)}
        </Text>
      </View>
      <Text style={styles.diffMessage}>
        {skinAgeDifferenceMessage(ageDiff)}
      </Text>
    </View>
  );
}

/** Resumen estético alineado al CRM: 3 tiles + anillo + barra numerada + consejo. */
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
      ? configuredYoucamScoreBand(overall, YOUCAM_OVERALL_TYPE, scoreConfig)
      : null;
  const advice =
    band != null
      ? configuredYoucamAdvice(YOUCAM_OVERALL_TYPE, band, scoreConfig)
      : null;
  const ringColor = band ? SCORE_BAND_COLOR[band] : primaryColor;

  return (
    <View style={styles.wrap}>
      <View style={styles.tilesRow}>
        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: '#DBEAFE' }]}>
            <AppIcon icon={Icons.heartPulse} size={18} color="#2563EB" />
          </View>
          <Text style={styles.tileLabel}>Salud de la piel</Text>
          <Text style={[styles.tileValue, { color: '#2563EB' }]}>
            {overall != null ? `${Math.round(overall)} / 100` : '—'}
          </Text>
          <Text style={styles.tileFooter}>Puntaje general</Text>
        </View>

        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: '#EDE9FE' }]}>
            <AppIcon icon={Icons.calendarDay} size={18} color="#7C3AED" />
          </View>
          <Text style={styles.tileLabel}>Edad de la piel</Text>
          <Text style={[styles.tileValue, { color: primaryColor }]}>
            {skinAge != null ? `${Math.round(skinAge)} años` : '—'}
          </Text>
          <Text style={styles.tileFooter}>(Edad actual)</Text>
        </View>

        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: '#FEF3C7' }]}>
            <AppIcon icon={Icons.star} size={18} color="#D97706" />
          </View>
          <Text style={styles.tileLabel}>Edad cronológica</Text>
          <Text style={styles.tileValue}>
            {chronologicalAge != null ? `${chronologicalAge} años` : '—'}
          </Text>
        </View>
      </View>

      {overall != null && band ? (
        <View style={styles.card}>
          <View style={styles.ringRow}>
            <ScoreRing score={overall} color={ringColor} />
            {ageDiff != null ? (
              <DiffBlock ageDiff={ageDiff} />
            ) : (
              <View style={styles.diffCol}>
                <Text style={styles.bandFallback}>
                  Su piel está en el nivel{' '}
                  {youcamScoreBandLabel(band).toLowerCase()}
                </Text>
              </View>
            )}
          </View>

          <ScoreRangeBar score={overall} ranges={ranges} />

          <View style={styles.insight}>
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              style={styles.insightIcon}
            >
              <Path
                d="M9 21h6M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z"
                stroke="#0284C7"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.insightText}>
              Tu piel tiene un puntaje de{' '}
              <Text style={styles.insightBold}>
                {Math.round(overall)}/100
              </Text>
              , un nivel{' '}
              <Text style={styles.insightBold}>
                {youcamScoreBandLabel(band).toLowerCase()}
              </Text>
              .{advice ? ` ${advice}` : ''}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
