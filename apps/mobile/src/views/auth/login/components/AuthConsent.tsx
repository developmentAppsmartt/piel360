import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import type { LoginStyles } from '../styles/login.styles';

type AuthConsentProps = {
  styles: LoginStyles;
  primaryColor: string;
  onDark: string;
  captchaChecked: boolean;
  termsChecked: boolean;
  onToggleCaptcha: () => void;
  onToggleTerms: () => void;
  disabled?: boolean;
};

export function AuthConsent({
  styles,
  primaryColor,
  onDark,
  captchaChecked,
  termsChecked,
  onToggleCaptcha,
  onToggleTerms,
  disabled,
}: AuthConsentProps) {
  return (
    <View style={styles.consentBlock}>
      <Pressable
        style={styles.checkRow}
        onPress={onToggleCaptcha}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: captchaChecked }}
      >
        <AppIcon
          icon={captchaChecked ? Icons.checkboxOn : Icons.checkboxOff}
          size={22}
          color={captchaChecked ? primaryColor : onDark}
        />
        <Text style={styles.checkLabel}>No soy un robot</Text>
      </Pressable>

      <Pressable
        style={styles.checkRow}
        onPress={onToggleTerms}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsChecked }}
      >
        <AppIcon
          icon={termsChecked ? Icons.checkboxOn : Icons.checkboxOff}
          size={22}
          color={termsChecked ? primaryColor : onDark}
        />
        <Text style={styles.checkLabel}>
          Acepto los{' '}
          <Text style={styles.checkLink}>términos y privacidad</Text>
        </Text>
      </Pressable>
    </View>
  );
}
