import { Pressable, Text, View } from 'react-native';
import type { RegisterStyles } from '../styles/register.styles';

export type SurveyOption = {
  value: string;
  label: string;
  color?: string;
};

type Props = {
  options: SurveyOption[];
  value?: string;
  onChange: (value: string) => void;
  styles: RegisterStyles;
  disabled?: boolean;
};

export function SurveyOptionList({
  options,
  value,
  onChange,
  styles,
  disabled,
}: Props) {
  return (
    <View style={styles.optionList}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.optionRow, active && styles.optionRowActive]}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
          >
            <View style={styles.optionRowContent}>
              {opt.color ? (
                <View
                  style={[styles.fitzSwatch, { backgroundColor: opt.color }]}
                />
              ) : null}
              <Text
                style={[styles.optionLabel, active && styles.optionLabelActive]}
              >
                {opt.label}
              </Text>
            </View>
            <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
              {active ? <View style={styles.radioInner} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
