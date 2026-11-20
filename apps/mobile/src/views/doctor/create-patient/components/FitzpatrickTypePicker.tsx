import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as PatientFormOptions from '../../../../data/patientFormOptions';

const FITZ_FALLBACK = [
  { value: 'I', color: '#F8E4D4', hint: 'Piel muy clara, siempre se quema, nunca se broncea.' },
  { value: 'II', color: '#E8C4A8', hint: 'Piel clara, suele quemarse, bronceado mínimo.' },
  { value: 'III', color: '#D1A074', hint: 'Clara a intermedia, a veces se quema.' },
  { value: 'IV', color: '#A67C52', hint: 'Intermedia, rara vez se quema.' },
  { value: 'V', color: '#8D5524', hint: 'Oscura, casi nunca se quema.' },
  { value: 'VI', color: '#5C3317', hint: 'Muy oscura, nunca se quema.' },
] as const;

const FITZ_OPTIONS =
  PatientFormOptions.PATIENT_FITZ_OPTIONS ?? FITZ_FALLBACK;

type FitzpatrickTypePickerProps = {
  value: string;
  onChange: (value: string) => void;
  accentColor: string;
  mutedColor: string;
  disabled?: boolean;
};

/** Misma presentación que el CRM: círculo de tono + número romano. */
export function FitzpatrickTypePicker({
  value,
  onChange,
  accentColor,
  mutedColor,
  disabled = false,
}: FitzpatrickTypePickerProps) {
  const hint = FITZ_OPTIONS.find((f) => f.value === value)?.hint;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {FITZ_OPTIONS.map((f) => {
          const active = value === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => onChange(f.value)}
              disabled={disabled}
              accessibilityLabel={`Fototipo ${f.value}`}
              style={[
                styles.card,
                active && {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}14`,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: f.color },
                  active && { borderColor: accentColor },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  { color: active ? accentColor : mutedColor },
                  active && styles.labelActive,
                ]}
              >
                {f.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: mutedColor }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
});
