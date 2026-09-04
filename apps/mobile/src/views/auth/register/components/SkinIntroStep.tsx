import { Pressable, Text, View } from 'react-native';
import type { RegisterStyles } from '../styles/register.styles';

type Props = {
  styles: RegisterStyles;
  onStart: () => void;
};

export function SkinIntroStep({ styles, onStart }: Props) {
  return (
    <View style={styles.skinIntro}>
      <View style={[styles.skinIntroDecor, { pointerEvents: 'none' }]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.skinIntroBlob,
              {
                top: 20 + i * 52,
                left: i % 2 === 0 ? 12 : undefined,
                right: i % 2 === 1 ? 16 : undefined,
                opacity: 0.12 + (i % 3) * 0.05,
                width: 28 + (i % 3) * 10,
                height: 28 + (i % 3) * 10,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.skinIntroTitle}>
        ¡Cuéntanos sobre tu piel y te ayudamos a cuidarla!
      </Text>
      <Text style={styles.skinIntroSubtitle}>
        Una piel sana empieza con información.
      </Text>
      <Pressable style={styles.skinIntroButton} onPress={onStart}>
        <Text style={styles.skinIntroButtonText}>Comenzar</Text>
      </Pressable>
    </View>
  );
}
