import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CountryCode } from 'libphonenumber-js';
import { normalizeNationalPhone } from '../../lib/phone';
import {
  countryFromCallingCode,
  filterPhoneCountries,
  type PhoneCountryOption,
} from '../../lib/phoneCountries';

type PhoneSplitInputsProps = {
  prefix: string;
  national: string;
  onPrefixChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  disabled?: boolean;
  prefixBackground?: string;
  nationalBackground?: string;
  textColor?: string;
  borderColor?: string;
};

/**
 * Prefijo internacional con bandera + lista desplegable de países,
 * y campo de número nacional (misma idea que react-phone-number-input en web).
 */
export function PhoneSplitInputs({
  prefix,
  national,
  onPrefixChange,
  onNationalChange,
  disabled = false,
  prefixBackground = '#FFFFFF',
  nationalBackground = '#FFFFFF',
  textColor = '#1A1A1A',
  borderColor = '#E5E7EB',
}: PhoneSplitInputsProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [preferredIso, setPreferredIso] = useState<CountryCode | null>(null);

  const selected = useMemo(
    () => countryFromCallingCode(prefix, preferredIso),
    [prefix, preferredIso],
  );

  const options = useMemo(() => filterPhoneCountries(query), [query]);

  function pickCountry(item: PhoneCountryOption) {
    setPreferredIso(item.iso);
    onPrefixChange(item.callingCode);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={[
            styles.countryBtn,
            { borderColor, backgroundColor: prefixBackground },
          ]}
          onPress={() => {
            if (!disabled) setOpen(true);
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`País ${selected.name}, +${selected.callingCode}`}
        >
          <Text style={styles.flag}>{selected.flag}</Text>
          <Text style={[styles.code, { color: textColor }]}>
            +{selected.callingCode}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>

        <TextInput
          style={[
            styles.nationalInput,
            {
              borderColor,
              backgroundColor: nationalBackground,
              color: textColor,
            },
          ]}
          value={national}
          onChangeText={(value) =>
            onNationalChange(normalizeNationalPhone(value))
          }
          keyboardType="phone-pad"
          editable={!disabled}
          placeholder="Número de celular"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>País / prefijo</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar país o código"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
            />
            <FlatList
              data={options}
              keyExtractor={(item) => item.iso}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.iso === selected.iso;
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => pickCountry(item)}
                  >
                    <Text style={styles.optionFlag}>{item.flag}</Text>
                    <Text style={styles.optionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.optionCode}>+{item.callingCode}</Text>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
  },
  flag: {
    fontSize: 18,
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  nationalInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  search: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F9FAFB',
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  optionActive: {
    backgroundColor: '#EFF6FF',
  },
  optionFlag: {
    fontSize: 22,
  },
  optionName: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  optionCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});
