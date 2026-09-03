import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import {
  YOUCAM_SKIN_TYPE_OVERLAYS,
  YOUCAM_SKIN_TYPE_ZONES,
} from '../../../../data/youcamMetricConventions';

type SkinTypeConventionStyles = {
  skinTypeConventionWrap: StyleProp<ViewStyle>;
  skinTypeConventionPanel: StyleProp<ViewStyle>;
  skinTypeMetricCol: StyleProp<ViewStyle>;
  skinTypeMetricLabel: StyleProp<TextStyle>;
  skinTypeMetricBar: StyleProp<ViewStyle>;
  skinTypeLegendBox: StyleProp<ViewStyle>;
  skinTypeLegendRow: StyleProp<ViewStyle>;
  skinTypeLegendText: StyleProp<TextStyle>;
  skinTypeZoneDash: StyleProp<ViewStyle>;
  skinTypeZoneSolid: StyleProp<ViewStyle>;
  skinTypeZoneDashRow: StyleProp<ViewStyle>;
  skinTypeZoneDashSeg: StyleProp<ViewStyle>;
  skinTypeDot: StyleProp<ViewStyle>;
};

type YoucamSkinTypeConventionBarProps = {
  styles: SkinTypeConventionStyles;
};

function ZoneLine({
  dashed,
  styles,
}: {
  dashed: boolean;
  styles: Pick<
    SkinTypeConventionStyles,
    'skinTypeZoneSolid' | 'skinTypeZoneDashRow' | 'skinTypeZoneDashSeg'
  >;
}) {
  if (!dashed) {
    return <View style={styles.skinTypeZoneSolid} />;
  }
  return (
    <View style={styles.skinTypeZoneDashRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skinTypeZoneDashSeg} />
      ))}
    </View>
  );
}

/**
 * Leyenda Perfect Corp para tipo de piel:
 * barras Resequedad / Oleosidad / Rojeces + Zona T (discontinua) / Zona U (continua).
 */
export function YoucamSkinTypeConventionBar({
  styles,
}: YoucamSkinTypeConventionBarProps) {
  return (
    <View style={styles.skinTypeConventionWrap} pointerEvents="none">
      <View style={styles.skinTypeConventionPanel}>
        {YOUCAM_SKIN_TYPE_OVERLAYS.map((item) => (
          <View key={item.key} style={styles.skinTypeMetricCol}>
            <Text style={styles.skinTypeMetricLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View
              style={[styles.skinTypeMetricBar, { backgroundColor: item.color }]}
            />
          </View>
        ))}
      </View>

      <View style={styles.skinTypeLegendBox}>
        {YOUCAM_SKIN_TYPE_ZONES.map((zone) => (
          <View key={zone.key} style={styles.skinTypeLegendRow}>
            <ZoneLine dashed={zone.lineStyle === 'dashed'} styles={styles} />
            <Text style={styles.skinTypeLegendText}>{zone.label}</Text>
          </View>
        ))}
        {YOUCAM_SKIN_TYPE_OVERLAYS.map((item) => (
          <View key={`leg-${item.key}`} style={styles.skinTypeLegendRow}>
            <View
              style={[styles.skinTypeDot, { backgroundColor: item.color }]}
            />
            <Text style={styles.skinTypeLegendText}>
              {item.label}: {item.intensityLabel}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
