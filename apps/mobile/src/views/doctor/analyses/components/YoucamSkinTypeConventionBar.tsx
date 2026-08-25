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
  skinTypeDot: StyleProp<ViewStyle>;
};

type YoucamSkinTypeConventionBarProps = {
  styles: SkinTypeConventionStyles;
};

function ZoneLine({ dashed }: { dashed: boolean }) {
  if (!dashed) {
    return (
      <View
        style={{
          width: 12,
          height: 1.5,
          borderRadius: 1,
          backgroundColor: '#222222',
        }}
      />
    );
  }
  return (
    <View style={{ width: 12, flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 2.5,
            height: 1.5,
            borderRadius: 1,
            backgroundColor: '#222222',
          }}
        />
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
            <ZoneLine dashed={zone.lineStyle === 'dashed'} />
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
