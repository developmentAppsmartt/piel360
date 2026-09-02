import { Text, TextInput, View, StyleSheet } from 'react-native';
import { normalizeAreaCode, normalizeNationalPhone } from '../../lib/phone';

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
  return (
    <View style={styles.row}>
      <View style={[styles.prefixWrap, { borderColor, backgroundColor: prefixBackground }]}>
        <Text style={[styles.plus, { color: '#6B7280' }]}>+</Text>
        <TextInput
          style={[styles.prefixInput, { color: textColor }]}
          value={prefix}
          onChangeText={(value) => onPrefixChange(normalizeAreaCode(value))}
          keyboardType="phone-pad"
          maxLength={4}
          editable={!disabled}
          placeholder="57"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <TextInput
        style={[
          styles.nationalInput,
          { borderColor, backgroundColor: nationalBackground, color: textColor },
        ]}
        value={national}
        onChangeText={(value) => onNationalChange(normalizeNationalPhone(value))}
        keyboardType="phone-pad"
        editable={!disabled}
        placeholder="3000000000"
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixWrap: {
    width: 72,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  plus: {
    fontSize: 15,
    marginRight: 2,
  },
  prefixInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  nationalInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
