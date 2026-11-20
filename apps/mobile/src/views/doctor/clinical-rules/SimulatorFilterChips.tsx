import { Pressable, Text, View } from 'react-native';
import type { createClinicalRulesStyles } from './styles/clinicalRules.styles';

type Styles = ReturnType<typeof createClinicalRulesStyles>;

type Option = { value: string; label: string };

type SimulatorFilterChipsProps = {
  label: string;
  /** Valor seleccionado; "" = opción vacía (Sin dato / Sin biotipo). */
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  options: readonly Option[];
  styles: Styles;
};

/** Chips de filtro del simulador (biotipo / fototipo), mismo patrón que el CRM. */
export function SimulatorFilterChips({
  label,
  value,
  onChange,
  emptyLabel,
  options,
  styles,
}: SimulatorFilterChipsProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => onChange('')}
          style={[styles.chip, !value && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: !value }}
          accessibilityLabel={emptyLabel}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>
            {emptyLabel}
          </Text>
        </Pressable>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} ${option.label}`}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
