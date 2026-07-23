import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { NosologiesStyles } from '../styles/nosologies.styles';

type NosologyCategoryRowProps = {
  styles: NosologiesStyles;
  label: string;
  onPress: () => void;
  onDark: string;
};

export function NosologyCategoryRow({
  styles,
  label,
  onPress,
  onDark,
}: NosologyCategoryRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowAction}>
        <AppIcon icon={Icons.chevronRight} size={16} color={onDark} />
      </View>
    </Pressable>
  );
}

type NosologyItemRowProps = {
  styles: NosologiesStyles;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function NosologyItemRow({
  styles,
  label,
  selected,
  onPress,
}: NosologyItemRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.radioOuter}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}
