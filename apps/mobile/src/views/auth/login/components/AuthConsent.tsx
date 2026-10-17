import type { MutableRefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import {
  RecaptchaCheckbox,
  type RecaptchaCheckboxHandle,
} from '../../../../components/RecaptchaCheckbox';
import type { LoginStyles } from '../styles/login.styles';

type AuthConsentProps = {
  styles: LoginStyles;
  primaryColor: string;
  onDark: string;
  captchaEnabled?: boolean;
  captchaSiteKey: string;
  captchaBaseUrl: string;
  /** Cambia para forzar remount del widget tras error/expiración. */
  captchaResetKey?: string | number;
  captchaRef?: MutableRefObject<RecaptchaCheckboxHandle | null>;
  onCaptchaVerify: (token: string) => void;
  onCaptchaExpire: () => void;
  captchaVerified?: boolean;
  termsChecked: boolean;
  onToggleTerms: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  disabled?: boolean;
};

export function AuthConsent({
  styles,
  primaryColor,
  onDark,
  captchaEnabled = true,
  captchaSiteKey,
  captchaBaseUrl,
  captchaResetKey = 0,
  captchaRef,
  onCaptchaVerify,
  onCaptchaExpire,
  captchaVerified,
  termsChecked,
  onToggleTerms,
  onOpenTerms,
  onOpenPrivacy,
  disabled,
}: AuthConsentProps) {
  return (
    <View style={styles.consentBlock}>
      {captchaEnabled ? (
        <RecaptchaCheckbox
          key={captchaResetKey}
          handleRef={captchaRef}
          siteKey={captchaSiteKey}
          baseUrl={captchaBaseUrl}
          onVerify={onCaptchaVerify}
          onExpire={onCaptchaExpire}
          verified={captchaVerified}
          disabled={disabled}
          languageCode="es"
        />
      ) : null}

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
