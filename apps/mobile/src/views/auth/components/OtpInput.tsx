import { useRef, useState } from 'react';
import {
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  editable?: boolean;
  textColor?: string;
  boxBackground?: string;
};

export function OtpInput({
  length = 5,
  value,
  onChange,
  editable = true,
  textColor = '#1A1A1A',
  boxBackground = 'rgba(255,255,255,0.94)',
}: OtpInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setAt(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (char && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={[
            styles.box,
            { backgroundColor: boxBackground, color: textColor },
          ]}
          value={d}
          onChangeText={(t) => {
            const cleaned = t.replace(/\D/g, '');
            if (cleaned.length > 1) {
              // Pegado de varios dígitos
              const slice = cleaned.slice(0, length);
              onChange(slice);
              const focusIdx = Math.min(slice.length, length - 1);
              refs.current[focusIdx]?.focus();
              return;
            }
            setAt(i, cleaned.slice(-1));
          }}
          onKeyPress={(e) => onKeyPress(i, e)}
          keyboardType="number-pad"
          maxLength={length}
          editable={editable}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 12,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
});
