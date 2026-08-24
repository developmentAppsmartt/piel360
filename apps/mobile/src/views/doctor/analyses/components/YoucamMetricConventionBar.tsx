import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  youcamConditionIntensity,
  youcamConventionGradient,
  youcamMetricConvention,
} from '../../../../data/youcamMetricConventions';
import { youcamMetricLabel } from '../../../../data/youcamMetricLabels';

type ConventionStyles = {
  conventionWrap: StyleProp<ViewStyle>;
  conventionBadge: StyleProp<ViewStyle>;
  conventionBadgeText: StyleProp<TextStyle>;
  conventionHigh: StyleProp<TextStyle>;
  conventionBar: StyleProp<ViewStyle>;
  conventionMarker: StyleProp<ViewStyle>;
  conventionLow: StyleProp<TextStyle>;
};

type YoucamMetricConventionBarProps = {
  metricType: string;
  score: number | null;
  styles: ConventionStyles;
};

/** Leyenda de intensidad sobre el viewer (estilo Perfect Corp / referencia). */
export function YoucamMetricConventionBar({
  metricType,
  score,
  styles,
}: YoucamMetricConventionBarProps) {
  const convention = youcamMetricConvention(metricType);
  const gradient = youcamConventionGradient(convention.color);
  const intensity = youcamConditionIntensity(score);
  const title =
    convention.badgeLabel ?? youcamMetricLabel(metricType);

  return (
    <View style={styles.conventionWrap} pointerEvents="none">
      <View style={[styles.conventionBadge, { backgroundColor: convention.color }]}>
        <Text style={styles.conventionBadgeText} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={styles.conventionHigh}>{convention.highLabel}</Text>
      <View style={styles.conventionBar}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, borderRadius: 6 }}
        />
        {intensity != null ? (
          <View
            style={[
              styles.conventionMarker,
              {
                top: `${Math.max(4, Math.min(92, intensity))}%`,
                borderColor: convention.color,
              },
            ]}
          />
        ) : null}
      </View>
      <Text style={styles.conventionLow}>{convention.lowLabel}</Text>
    </View>
  );
}
