import { View } from 'react-native';
import type { RegisterStyles } from '../styles/register.styles';

type Props = {
  total: number;
  current: number;
  styles: RegisterStyles;
};

export function SurveyProgressDots({ total, current, styles }: Props) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i === current && styles.progressDotActive]}
        />
      ))}
    </View>
  );
}
