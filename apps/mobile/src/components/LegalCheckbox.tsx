import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useBranding } from '../context/BrandingContext';

/** Casilla con su texto (términos, política de datos, consentimientos). */
export function LegalCheckbox({
  checked,
  onChange,
  label,
  disabled,
  labelStyle,
  onPressLink,
  linkText,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  /** Enlace opcional al documento («Leer términos»). */
  onPressLink?: () => void;
  linkText?: string;
}) {
  const branding = useBranding();
  const accent = branding.colors.primary;
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View style={[styles.box, { borderColor: accent }, checked && { backgroundColor: accent }]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={[styles.label, labelStyle]}>
        {label}
        {onPressLink && linkText ? (
          <Text style={[styles.link, { color: accent }]} onPress={onPressLink}>
            {` ${linkText}`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tick: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  label: { flex: 1, fontSize: 14, lineHeight: 20, color: '#1A1A1A' },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});
