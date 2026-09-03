import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
  conventionLow: StyleProp<TextStyle>;
};

type YoucamMetricConventionBarProps = {
  metricType: string;
  styles: ConventionStyles;
};

/** Leyenda de color sobre el viewer (estilo Perfect Corp). Sin marcador de score. */
export function YoucamMetricConventionBar({
  metricType,
  styles,
}: YoucamMetricConventionBarProps) {
  const convention = youcamMetricConvention(metricType);
  const gradient = convention.gradient ?? youcamConventionGradient(convention.color);
  const title = convention.badgeLabel ?? youcamMetricLabel(metricType);

  return (
    <View style={styles.conventionWrap} pointerEvents="none">
      {!convention.hideBarBadge ? (
        <View
          style={[styles.conventionBadge, { backgroundColor: convention.color }]}
        >
          <Text style={styles.conventionBadgeText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
      {!convention.hideScaleLabels ? (
        <Text style={styles.conventionHigh} numberOfLines={2}>
          {convention.highLabel}
        </Text>
      ) : null}
      <View style={styles.conventionBar}>
        <LinearGradient
          colors={
            (gradient.length >= 2
              ? gradient
              : youcamConventionGradient(convention.color)) as [
              string,
              string,
              ...string[],
            ]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, borderRadius: 5 }}
        />
      </View>
      {!convention.hideScaleLabels ? (
        <Text style={styles.conventionLow} numberOfLines={2}>
          {convention.lowLabel}
        </Text>
      ) : null}
    </View>
  );
}
