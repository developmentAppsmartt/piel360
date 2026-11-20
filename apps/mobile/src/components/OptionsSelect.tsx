import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { Icons } from './icons';
import { optionsSelectStyles as styles } from './optionsSelect.styles';

export type OptionsSelectItem = {
  value: string;
  label: string;
};

type OptionsSelectProps = {
  value: string;
  options: readonly OptionsSelectItem[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Estilo del campo cerrado (mismo que un input). */
  fieldStyle?: StyleProp<ViewStyle>;
  textColor?: string;
  accentColor?: string;
};

/** Lista desplegable de una opción. */
export function OptionsSelect({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  fieldStyle,
  textColor = '#0F172A',
  accentColor = '#1e5a9e',
}: OptionsSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <>
      <Pressable
        style={[styles.field, fieldStyle]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selected?.label ?? placeholder}
      >
        <Text
          style={[
            styles.fieldText,
            { color: selected ? textColor : '#9CA3AF' },
          ]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
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
            <FlatList
              data={[...options]}
              keyExtractor={(item) => item.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[styles.option, active && { backgroundColor: `${accentColor}14` }]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && { color: accentColor, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <AppIcon icon={Icons.check} size={18} color={accentColor} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
