import type { ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import type { AppIconName } from '../../../../components/icons';
import type { LoginStyles } from '../styles/login.styles';

type LoginIconFieldProps = TextInputProps & {
  styles: LoginStyles;
  label: string;
  icon: AppIconName;
  endAdornment?: ReactNode;
};

export function LoginIconField({
  styles,
  label,
  icon,
  endAdornment,
  ...props
}: LoginIconFieldProps) {
  return (
    <View style={styles.iconField}>
      <AppIcon icon={icon} size={20} color="#64748B" />
      <View style={styles.iconFieldBody}>
        <Text style={styles.iconFieldLabel}>{label}</Text>
        <TextInput
          {...props}
          style={styles.iconFieldInput}
          placeholderTextColor="#94A3B8"
        />
      </View>
      {endAdornment}
    </View>
  );
}
