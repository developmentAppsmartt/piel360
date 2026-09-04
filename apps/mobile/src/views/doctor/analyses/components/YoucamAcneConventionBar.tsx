import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { YOUCAM_ACNE_OVERLAYS } from '../../../../data/youcamMetricConventions';

type AcneConventionStyles = {
  acneConventionWrap: StyleProp<ViewStyle>;
  acneConventionPanel: StyleProp<ViewStyle>;
  acneConventionRow: StyleProp<ViewStyle>;
  acneConventionLabel: StyleProp<TextStyle>;
  acneConventionBar: StyleProp<ViewStyle>;
};

type YoucamAcneConventionBarProps = {
  styles: AcneConventionStyles;
};

/**
 * Leyenda Perfect Corp para acné:
 * Puntos Negros (gris) · Espinillas (blanco) · Barros (azul claro).
 */
export function YoucamAcneConventionBar({ styles }: YoucamAcneConventionBarProps) {
  return (
    <View style={[styles.acneConventionWrap, { pointerEvents: 'none' }]}>
      <View style={styles.acneConventionPanel}>
        {YOUCAM_ACNE_OVERLAYS.map((item) => (
          <View key={item.key} style={styles.acneConventionRow}>
            <Text style={styles.acneConventionLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View
              style={[
                styles.acneConventionBar,
                {
                  backgroundColor: item.color,
                  borderWidth: item.color === '#FFFFFF' ? 1 : 0,
                  borderColor: 'rgba(0,0,0,0.35)',
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
