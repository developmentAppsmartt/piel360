import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBranding } from '../../../../context/BrandingContext';
import type { LoginStyles } from '../styles/login.styles';

type AuthGradientButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: LoginStyles;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AuthGradientButton({
  label,
  onPress,
  disabled,
  loading,
  styles,
  containerStyle,
}: AuthGradientButtonProps) {
  const branding = useBranding();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonWrap,
        { alignSelf: 'stretch' },
        containerStyle,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={[
            ...(pressed
              ? branding.colors.buttonGradientHover
              : branding.colors.buttonGradient),
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color={branding.colors.buttonGradientText} />
          ) : (
            <Text style={styles.buttonText}>{label}</Text>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}
