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
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
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
  onOpenTerms,
  onOpenPrivacy,
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

      <View style={styles.checkRow}>
        <Pressable
          onPress={onToggleTerms}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsChecked }}
        >
          <AppIcon
            icon={termsChecked ? Icons.checkboxOn : Icons.checkboxOff}
            size={22}
            color={termsChecked ? primaryColor : onDark}
          />
        </Pressable>
        <Text style={styles.checkLabel}>
          He leído y acepto los{' '}
          <Text
            style={styles.checkLink}
            onPress={() => {
              if (!disabled) onOpenTerms?.();
            }}
          >
            Términos y Condiciones
          </Text>
          {' y la '}
          <Text
            style={styles.checkLink}
            onPress={() => {
              if (!disabled) onOpenPrivacy?.();
            }}
          >
            Política de Privacidad
          </Text>
        </Text>
      </View>
    </View>
  );
}
