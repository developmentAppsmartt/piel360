import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { Icons } from './icons';
import { PATIENT_DOC_TYPES, docTypeLabel } from '../data/patientFormOptions';
import { useBranding } from '../context/BrandingContext';

type DocTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** El estilo del campo de texto del formulario, para que combine. */
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
};

/** Lista desplegable del tipo de documento (antes eran chips con CC/CE/TI/PA:
 * con los nombres completos de la DIAN ya no caben). */
export function DocTypeSelect({
  value,
  onChange,
  disabled = false,
  triggerStyle,
  valueStyle,
}: DocTypeSelectProps) {
  const branding = useBranding();
  const accent = branding.colors.primary;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.trigger, triggerStyle]}
        accessibilityRole="button"
        accessibilityLabel="Tipo de documento"
      >
        <Text style={[styles.value, valueStyle]} numberOfLines={1}>
          {docTypeLabel(value) ?? 'Selecciona el tipo de documento'}
        </Text>
        <View style={styles.chevron}>
          <AppIcon icon={Icons.chevronRight} size={20} color={accent} />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Tipo de documento</Text>
            <ScrollView>
              {PATIENT_DOC_TYPES.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, active && { backgroundColor: `${accent}1A` }]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.optionText, active && { color: accent, fontWeight: '700' }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  chevron: { transform: [{ rotate: '90deg' }] },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    maxHeight: '80%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#1A1A1A' },
  option: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  optionText: { fontSize: 15, color: '#1A1A1A' },
});
