import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useBranding } from '../../../../context/BrandingContext';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';

const CENTER = { x: 50, y: 55 };
const RADIUS = 40;

function polarToCartesian(angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: CENTER.x + RADIUS * Math.cos(rad),
    y: CENTER.y + RADIUS * Math.sin(rad),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

type SkiniverRiskGaugeProps = {
  percent: number;
  riskLabel: string;
};

export function SkiniverRiskGauge({
  percent,
  riskLabel,
}: SkiniverRiskGaugeProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const clamped = Math.max(0, Math.min(100, percent));
  const rotation = -90 + (clamped / 100) * 180;
  const tip = polarToCartesian(90 + rotation);

  return (
    <View style={styles.gaugeWrap}>
      <Svg viewBox="0 0 100 70" width="100%" height={140}>
        <Path
          d={arcPath(0, 60)}
          stroke="#22c55e"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={arcPath(60, 120)}
          stroke="#facc15"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={arcPath(120, 180)}
          stroke="#ef4444"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <Line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={tip.x}
          y2={tip.y}
          stroke={branding.colors.text}
          strokeWidth={2}
        />
        <Circle cx={CENTER.x} cy={CENTER.y} r={3} fill={branding.colors.text} />
      </Svg>
      <View style={styles.gaugeLabels}>
        <Text style={[styles.gaugeLabel, { color: '#22c55e' }]}>Bajo</Text>
        <Text style={[styles.gaugeLabel, { color: '#ca8a04' }]}>Medio</Text>
        <Text style={[styles.gaugeLabel, { color: '#ef4444' }]}>Alto</Text>
      </View>
      <Text style={styles.gaugeRisk}>
        Riesgo: <Text style={styles.gaugeRiskStrong}>{riskLabel || '—'}</Text>
      </Text>
    </View>
  );
}
